(function() {
	function formatStr(format) {
		var args = Array.prototype.slice.call(arguments, 1);
		return format.replace(/{(\d+)}/g, function(match, number) {
			return typeof args[number] != 'undefined' ? args[number] : match;
		});
	};
	
	var loadEnvsUrl = "loadEnvs?objectId={0}";
	var getEmilEnvironmentUrl = "getEmilEnvironment?envId={0}";
	var getAllEnvsUrl = "getAllEnvironments";
	var metadataUrl = "getObjectMetadata?objectId={0}";
	var startEnvWithDigitalObjectUrl = "startEnvWithDigitalObject?objectId={0}&envId={1}";
	var stopUrl = "stop?sessionId={0}";
	var screenshotUrl = "screenshot?sessionId={0}";
	var mediaCollectionURL = "getCollectionList?objectId={0}";
	var changeMediaURL = "changeMedia?sessionId={0}&objectId={1}&driveId={2}&label={3}";
	var getObjectListURL = "getObjectList";
	
	angular.module('emilUI', ['angular-loading-bar', 'ngSanitize', 'ngAnimate', 'ui.router', 'ui.bootstrap', 'ui.select', 'angular-growl', 'dibari.angular-ellipsis', 'ui.bootstrap.contextMenu', 
				   'pascalprecht.translate', 'smart-table', 'angular-page-visibility'])

	.config(function($stateProvider, $urlRouterProvider, growlProvider, $httpProvider, $translateProvider) {
		/*
		 * Internationalization 
		 */
		$translateProvider.useStaticFilesLoader({
			prefix: 'locales/',
			suffix: '.json'
		});

		// escape HTML in the translation
		$translateProvider.useSanitizeValueStrategy('escape');

		$translateProvider.registerAvailableLanguageKeys(['en', 'de'], {
		  'en_*': 'en',
		  'de_*': 'de'
		});

		// automatically choose best language for user
		$translateProvider.determinePreferredLanguage();
		// $translateProvider.preferredLanguage('en');

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
					}/*,
					environmentList: function($http, localConfig) {
						return $http.get(localConfig.data.eaasBackendURL + getAllEnvsUrl);
					}*/
				},
				controller: function($state, $stateParams, objectList, $translate) {
					var vm = this;
					
					vm.objectList = objectList.data.objects;
					
					vm.menuOptions = [
						[$translate.instant('JS_MENU_RENDER'), function ($itemScope) {							
							$state.go('wf-b.choose-env', {objectId: $itemScope.object.id});
						}],
						null, // Dividier
						[$translate.instant('JS_MENU_EDIT'), function ($itemScope) {
							window.location.href = "/emil-admin-ui/#/wf-s/edit-object-characterization?objectId=" + $itemScope.object.id;
						}],
						[$translate.instant('JS_MENU_DETAILS'), function ($itemScope) {
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
					},
					allEnvironments: function($stateParams, $http, localConfig) {
						return $http.get(localConfig.data.eaasBackendURL + getAllEnvsUrl);
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
						controller: function ($scope, $state, objMetadata, objEnvironments, allEnvironments, growl, $translate) {
							this.noSuggestion = false;
							
							if (objEnvironments.data.status !== "0" || objEnvironments.data.environments.length === 0) {
								this.noSuggestion = true;
							}
							
							if (objMetadata.data.status !== "0") {
								$state.go('error', {errorMsg: {title: "Metadata Error " + objMetadata.data.status, message: objMetadata.data.message}});
								return;
							}
							
							this.objecttitle = objMetadata.data.title;
							
							if(this.noSuggestion)
							{
								if(allEnvironments.data.status === "0")
									this.environments = allEnvironments.data.environments;
								else 
									$state.go('error', {errorMsg: {title: "Environments Error " + objEnvironments.data.status, message: objEnvironments.data.message}});
									
							}
							else
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
					chosenEnv: function($http, $stateParams, localConfig) {
						return $http.get(localConfig.data.eaasBackendURL + formatStr(getEmilEnvironmentUrl, $stateParams.envId));
					},
					mediaCollection: function($http, $stateParams, localConfig) {
						return $http.get(localConfig.data.eaasBackendURL + formatStr(mediaCollectionURL, $stateParams.objectId));
					}
				},
				views: {
					'wizard': {
						templateUrl: "partials/wf-b/emulator.html",
						controller: function ($scope, $sce, $state, initData, growl) {
							if (initData.data.status !== "0") {
								$state.go('error', {errorMsg: {title: "Emulation Error " + initData.data.status, message: initData.data.message}});
								return;
							}

							this.iframeurl = $sce.trustAsResourceUrl(initData.data.iframeurl);
						},
						controllerAs: "startEmuCtrl"
					},
					'actions': {
						templateUrl: 'partials/wf-b/actions.html',
						controller: function ($scope, $window, $state, $http, $timeout, $uibModal, $stateParams, initData, mediaCollection, growl, localConfig, $translate, $pageVisibility, chosenEnv) {
							var vm = this;
							
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
							
							vm.help = function() {
								showHelpDialog(chosenEnv.data.helpText);
							};
							
							vm.driveId = initData.data.driveId;
							
							vm.stopEmulator = function() {
								$http.get(localConfig.data.eaasBackendURL + formatStr(stopUrl, initData.data.id))['finally'](function() {
									window.location = localConfig.data.stopEmulatorRedirectURL;
								});
							};
							
							vm.restartEmulator = function() {
								$http.get(localConfig.data.eaasBackendURL + formatStr(stopUrl, initData.data.id))['finally'](function() {
									$state.reload();
								});
							};
						
							vm.screenshot = function() {
								 window.open(localConfig.data.eaasBackendURL + formatStr(screenshotUrl, initData.data.id), '_blank', ''); 
							};
							
							var currentMediumLabel = mediaCollection.data.media.length > 0 ? mediaCollection.data.media[0].labels[0] : null;
							
							vm.openChangeMediaDialog = function() {
								$uibModal.open({
									animation: true,
									templateUrl: 'partials/wf-b/change-media-dialog.html',
									controller: function($scope) {
										this.chosen_medium_label = currentMediumLabel;
										this.media = mediaCollection.data.media;
										this.isChangeMediaSubmitting = false;

										this.changeMedium = function(newMediumLabel) {
											if (newMediumLabel == null) {
												growl.warning($translate.instant('JS_MEDIA_NO_MEDIA'));
												return;
											}
											
											this.isChangeMediaSubmitting = true;
											$("html, body").addClass("wait");
											$http.get(localConfig.data.eaasBackendURL + formatStr(changeMediaURL, initData.data.id, $stateParams.objectId, initData.data.driveId, newMediumLabel)).then(function(resp) {
												if (resp.data.status === "0") {
													growl.success($translate.instant('JS_MEDIA_CHANGETO') + newMediumLabel);
													currentMediumLabel = newMediumLabel;
													$scope.$close();
												} else {
													growl.error($translate.instant('JS_MEDIA_CHANGE_ERR'), {title: "Error"});
												}
											})['finally'](function() {
												$("html, body").removeClass("wait");
											});
										};
									},
									controllerAs: "openChangeMediaDialogCtrl"
								});
							}
							
							vm.openChangeMediaNativeDialog = function() {
								$uibModal.open({
									animation: true,
									templateUrl: 'partials/wf-b/change-media-native-dialog.html',
									controller: function($scope) {
										this.helpmsg = initData.data.helpmsg;
									},
									controllerAs: "openChangeMediaNativeDialogCtrl"
								});
							}
							
							vm.sessionId = initData.data.id;
							
							var closeEmulatorOnTabLeaveTimer = null;
							var leaveWarningShownBefore = false;
							
							var deregisterOnPageFocused = $pageVisibility.$on('pageFocused', function() {								
								$timeout.cancel(closeEmulatorOnTabLeaveTimer);
							});

							var deregisterOnPageBlurred = $pageVisibility.$on('pageBlurred', function() {
								if (!leaveWarningShownBefore) {
									$window.alert($translate.instant('JS_EMU_LEAVE_PAGE'));
									leaveWarningShownBefore = true;
								}
								
								closeEmulatorOnTabLeaveTimer = $timeout(function() {
									vm.stopEmulator();
								}, 3 * 60 * 1000);
							});
							
							$scope.$on("$destroy", function() {
								deregisterOnPageFocused();
								deregisterOnPageBlurred();
							});
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
