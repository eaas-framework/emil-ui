(function() {
	function formatStr(format) {
		var args = Array.prototype.slice.call(arguments, 1);
		return format.replace(/{(\d+)}/g, function(match, number) {
			return typeof args[number] != 'undefined' ? args[number] : match;
		});
	};

	var baseUrl = "http://132.230.3.212:8080/emil/Emil/";
	var loadEnvsUrl = baseUrl + "loadEnvs?objectId={0}";
	var initUrl = baseUrl + "init?objectId={0}&envId={1}";
	var stopUrl = baseUrl + "stop?sessionId={0}";

	angular.module('emilUI', ['ngSanitize', 'ngAnimate', 'ui.router', 'ui.bootstrap', 'ui.select', 'angular-growl'])

	.config(function($stateProvider, $urlRouterProvider, growlProvider, $httpProvider) {
		// Add a global AJAX error handler
		$httpProvider.interceptors.push(function($q, growl) {
			return {
				responseError: function(rejection) {
					growl.error('Momentant ist der EMiL Server leider nicht erreichbar..', {title: 'Error ' + rejection.status});
					// TODO redirect to error page
					// return $q.reject(rejection);
				}
			};
		});

		// For any unmatched url
		$urlRouterProvider.otherwise("/wf-b/choose-environment");
		//
		// Now set up the states
		$stateProvider
			.state('wf-b', {
				abstract: true,
				url: "/wf-b?objectId",
				templateUrl: "partials/wf-b/base.html",
				resolve: {
					objAndEnvsData: function($stateParams, $http) {
						return $http.get(formatStr(loadEnvsUrl, $stateParams.objectId));
					}
				},
				controller: function($uibModal) {
					this.open = function() {
						$uibModal.open({
							animation: true,
							templateUrl: 'partials/wf-b/help-emil-dialog.html'
						});
					}
				},
				controllerAs: "baseCtrl"
			})
			.state('wf-b.choose-env', {
				url: "/choose-environment",
				views: {
					'wizard': {
						templateUrl: 'partials/wf-b/choose-env.html',
						controller: function ($scope, objAndEnvsData) {
							this.objecttitle = objAndEnvsData.data.title;
							this.environments = objAndEnvsData.data.environments;
						},
						controllerAs: "chooseEnvCtrl"
					},
					'metadata': {
						templateUrl: 'partials/wf-b/metadata.html',
						controller: function ($scope, objAndEnvsData) {
							this.metadata = objAndEnvsData.data.metadata;
						},
						controllerAs: "metadataCtrl"
					}
				}
			})
			.state('wf-b.emulator', {
				url: "/emulator?envId",
				resolve: {
					initData: function($http, $stateParams) {
						return $http.get(formatStr(initUrl, $stateParams.objectId, $stateParams.envId));
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
						controller: function ($scope, $http, initData, growl) {
							this.stopEmulator = function() {
								$http.get(formatStr(stopUrl, initData.data.id)).then(function(response) {
									if (response.data.status === "0") {
										growl.success(response.data.message, {title: 'Ausführung erfolgreich beendet'});
									} else {
										growl.error(response.data.message, {title: 'Error ' + response.data.status});
									}
								});
							};

							this.sessionId = initData.data.id;
						},
						controllerAs: "actionsCtrl"
					},
					'metadata': {
						templateUrl: 'partials/wf-b/metadata.html',
						controller: function ($scope, objAndEnvsData) {
							this.metadata = objAndEnvsData.data.metadata;
						},
						controllerAs: "metadataCtrl"
					}
				}
			});

			growlProvider.globalTimeToLive(5000);
	});
})();