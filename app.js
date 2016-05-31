(function() {
	function formatStr(format) {
		var args = Array.prototype.slice.call(arguments, 1);
		return format.replace(/{(\d+)}/g, function(match, number) {
			return typeof args[number] != 'undefined' ? args[number] : match;
		});
	};
	
	var loadEnvsUrl = "loadEnvs?objectId={0}";
	var metadataUrl = "getObjectMetadata?objectId={0}";
	var startEnvWithDigitalObjectUrl = "startEnvWithDigitalObject?objectId={0}&envId={1}";
	var stopUrl = "stop?sessionId={0}";
	var screenshotUrl = "screenshot?sessionId={0}";
	var mediaCollectionURL = "getCollectionList?objectId={0}";
	var changeMediaURL = "changeMedia?sessionId={0}&objectId={1}&driveId={2}&label={3}";
	var getObjectListURL = "getObjectList";
	
	angular.module('emilUI', ['angular-loading-bar', 'ngSanitize', 'ngAnimate', 'ui.router', 'ui.bootstrap', 'ui.select', 'angular-growl', 'dibari.angular-ellipsis', 'ui.bootstrap.contextMenu'])
	
	.config(function($stateProvider, $urlRouterProvider, growlProvider, $httpProvider) {
		// Add a global AJAX error handler
		$httpProvider.interceptors.push(function($q, $injector) {
			return {
				responseError: function(rejection) {
					$injector.get('$state').go('error', {errorMsg: {title: "Server Error", message: rejection}});
					return $q.reject(rejection);
				}
			};
		});

		// For any unmatched url
		$urlRouterProvider.otherwise("/object-overview");

		// Now set up the states
		$stateProvider
			.state('error', {
				url: "/error",
				templateUrl: "partials/error.html",
				params: {
					errorMsg: {title: "", message: ""}
				},
				controller: function($stateParams) {
					this.errorMsg = $stateParams.errorMsg;
				},
				controllerAs: "errorCtrl"
			})
			.state('object-overview', {
				url: "/object-overview",
				templateUrl: "partials/object-overview.html",
				resolve: {
					localConfig: function($http) {
						return $http.get("config.json");
					},
					objectList: function($http, localConfig) {
						return $http.get(localConfig.data.eaasBackendURL + getObjectListURL);
					}
				},
				controller: function($state, $stateParams, objectList) {
					var vm = this;
					
					vm.objectList = objectList.data.objects;
					
					vm.menuOptions = [
						['Objekt öffnen', function ($itemScope) {							
							$state.go('wf-b.choose-env', {objectId: $itemScope.object.id});
						}],
						null, // Dividier
						['Bearbeiten', function ($itemScope) {
							alert("TBD");
						}],
						['Details', function ($itemScope) {
							alert("TBD");
						}]
					];
				},
				controllerAs: "objectOverviewCtrl"
			})
			.state('wf-b', {
				abstract: true,
				url: "/wf-b?objectId",
				templateUrl: "partials/wf-b/base.html",
				resolve: {
					localConfig: function($http) {
						return $http.get("config.json");
					},
					objEnvironments: function($stateParams, $http, localConfig) {
						return $http.get(localConfig.data.eaasBackendURL + formatStr(loadEnvsUrl, $stateParams.objectId));
					},
					objMetadata: function($stateParams, $http, localConfig) {
						return $http.get(localConfig.data.eaasBackendURL + formatStr(metadataUrl, $stateParams.objectId));
					}
				},
				controller: function($uibModal, objMetadata) {
					function showHelpDialog(helpText) {
						$uibModal.open({
							animation: true,
							templateUrl: 'partials/wf-b/help-emil-dialog.html',
							controller: function($scope) {
								this.helpText = helpText;
							},
							controllerAs: "helpDialogCtrl"
						});
					}
					
					this.open = function() {
						showHelpDialog("Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor " +
											   "invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum.");
					};
											   
					this.showObjectHelpDialog = function() {
						showHelpDialog(objMetadata.help);
					};
				},
				controllerAs: "baseCtrl"
			})
			.state('wf-b.choose-env', {
				url: "/choose-environment",
				views: {
					'wizard': {
						templateUrl: 'partials/wf-b/choose-env.html',
						controller: function ($scope, $state, objMetadata, objEnvironments, growl) {
							if (objEnvironments.data.status !== "0") {
								$state.go('error', {errorMsg: {title: "Environments Error " + objEnvironments.data.status, message: objEnvironments.data.message}});
								return;
							}
							
							if (objEnvironments.data.environments.length === 0) {
								$state.go('error', {errorMsg: {title: "Environments Error", message: "Leider konnten keine Umgebungen zu diesem Objekt gefunden werden.."}});
								return;
							}
							
							if (objMetadata.data.status !== "0") {
								$state.go('error', {errorMsg: {title: "Metadata Error " + objMetadata.data.status, message: objMetadata.data.message}});
								return;
							}
							
							this.objecttitle = objMetadata.data.title;
							this.environments = objEnvironments.data.environments;
						},
						controllerAs: "chooseEnvCtrl"
					},
					'metadata': {
						templateUrl: 'partials/wf-b/metadata.html',
						controller: function ($scope, objMetadata) {
							this.metadata = objMetadata.data.metadata;
						},
						controllerAs: "metadataCtrl"
					}
				}
			})
			.state('wf-b.emulator', {
				url: "/emulator?envId",
				resolve: {
					initData: function($http, $stateParams, localConfig) {
						return $http.get(localConfig.data.eaasBackendURL + formatStr(startEnvWithDigitalObjectUrl, $stateParams.objectId, $stateParams.envId));
					},
					mediaCollection: function($http, $stateParams, localConfig) {
						return $http.get(localConfig.data.eaasBackendURL + formatStr(mediaCollectionURL, $stateParams.objectId));
					}
				},
				views: {
					'wizard': {
						templateUrl: "partials/wf-b/emulator.html",
						controller: function ($scope, $sce, initData) {
							this.iframeurl = $sce.trustAsResourceUrl(initData.data.iframeurl);
						},
						controllerAs: "startEmuCtrl"
					},
					'actions': {
						templateUrl: 'partials/wf-b/actions.html',
						controller: function ($scope, $state, $http, $uibModal, $stateParams, initData, mediaCollection, growl, localConfig) {
							this.driveId = initData.data.driveId;
							
							this.stopEmulator = function() {
								$http.get(localConfig.data.eaasBackendURL + formatStr(stopUrl, initData.data.id))['finally'](function() {
									window.location = localConfig.data.stopEmulatorRedirectURL;
								});
							};
							
							this.restartEmulator = function() {
								$http.get(localConfig.data.eaasBackendURL + formatStr(stopUrl, initData.data.id))['finally'](function() {
									$state.reload();
								});
							};
						
							this.screenshot = function() {
								 window.open(localConfig.data.eaasBackendURL + formatStr(screenshotUrl, initData.data.id), '_blank', ''); 
							};
							
							var currentMediumLabel = mediaCollection.data.media.length > 0 ? mediaCollection.data.media[0].labels[0] : null;
							
							this.openChangeMediaDialog = function() {
								$uibModal.open({
									animation: true,
									templateUrl: 'partials/wf-b/change-media-dialog.html',
									controller: function($scope) {
										this.chosen_medium_label = currentMediumLabel;
										this.media = mediaCollection.data.media;
										this.isChangeMediaSubmitting = false;

										this.changeMedium = function(newMediumLabel) {
											if (newMediumLabel == null) {
												growl.warning("Sie haben kein Medium ausgewählt..");
												return;
											}
											
											this.isChangeMediaSubmitting = true;
											$("html, body").addClass("wait");
											$http.get(localConfig.data.eaasBackendURL + formatStr(changeMediaURL, initData.data.id, $stateParams.objectId, initData.data.driveId, newMediumLabel)).then(function(resp) {
												if (resp.data.status === "0") {
													growl.success("Das Medium wird auf " + newMediumLabel + " gewechselt.");
													currentMediumLabel = newMediumLabel;
													$scope.$close();
												} else {
													growl.error("Das Medium konnte nicht gewechselt werden.", {title: "Error"});
												}
											})['finally'](function() {
												$("html, body").removeClass("wait");
											});
										};
									},
									controllerAs: "openChangeMediaDialogCtrl"
								});
							}
							
							this.openChangeMediaNativeDialog = function() {
								$uibModal.open({
									animation: true,
									templateUrl: 'partials/wf-b/change-media-native-dialog.html',
									controller: function($scope) {
										this.helpmsg = initData.data.helpmsg;
									},
									controllerAs: "openChangeMediaNativeDialogCtrl"
								});
							}
							
							this.sessionId = initData.data.id;
						},
						controllerAs: "actionsCtrl"
					},
					'metadata': {
						templateUrl: 'partials/wf-b/metadata.html',
						controller: function ($scope, objMetadata) {
							this.metadata = objMetadata.data.metadata;
						},
						controllerAs: "metadataCtrl"
					}
				}
			});
			
		growlProvider.globalTimeToLive(5000);
	});
})();