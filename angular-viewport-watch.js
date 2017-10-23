"use strict";

(function () {
    function viewportWatch() {
        var viewportUpdateTimeout;

        function debouncedViewportUpdate() {
            if (viewportUpdateTimeout) {
                clearTimeout(viewportUpdateTimeout);
            }

            viewportUpdateTimeout = setTimeout(function () {
                window.scrollMonitor.update();
            }, 10);
        }

        return {
            restrict: "AE",
            link: function (scope, element, attr) {
                var viewportUpdate = debouncedViewportUpdate;
                var elementWatcher;

                if (attr.watchContainer) {
                    var container = element[0].closest(attr.watchContainer);

                    var watchContainer;
                    if (container.$watchContainer) {
                        watchContainer = container.$watchContainer;
                    } else {
                        container.$watchContainer = watchContainer = window.scrollMonitor.createContainer(container);

                        angular.element(container).on('$destroy', function () {
                            watchContainer.destroy();

                            if (watchContainer.containerWatcher) {
                                watchContainer.containerWatcher.destroy();
                            }

                            window.scrollMonitor.update();
                        });
                    }

                    viewportUpdate = function() {
                        if (viewportUpdateTimeout) {
                            clearTimeout(viewportUpdateTimeout);
                        }

                        viewportUpdateTimeout = setTimeout(function () {
                            watchContainer.update();
                        }, 10);
                    };

                    elementWatcher = watchContainer.create(element, scope.$eval(attr.viewportWatch || "0"));
                } else {
                    elementWatcher = window.scrollMonitor.create(element, $scope.$eval(attr.viewportWatch || "0"));
                }

                function watchDuringDisable() {
                    this.$$watchersBackup = this.$$watchersBackup || [];
                    this.$$watchers = this.$$watchersBackup;

                    var unwatch = this.constructor.prototype.$watch.apply(this, arguments);

                    this.$$watchers = null;

                    return unwatch;
                }

                function toggleWatchers(scope, enable) {
                    var digest, current, next = scope;
                    do {
                        current = next;

                        if (enable) {
                            if (current.hasOwnProperty("$$watchersBackup")) {
                                current.$$watchers = current.$$watchersBackup;
                                delete current.$$watchersBackup;
                                delete current.$watch;
                                digest = !scope.$root.$$phase;
                            }
                        } else {
                            if (!current.hasOwnProperty("$$watchersBackup")) {
                                current.$$watchersBackup = current.$$watchers;
                                current.$$watchers = null;
                                current.$watch = watchDuringDisable;
                            }
                        }

                        next = current.$$childHead;

                        while (!next && current !== scope) {
                            if (current.$$nextSibling) {
                                next = current.$$nextSibling;
                            } else {
                                current = current.$parent;
                            }
                        }
                    } while (next);

                    if (digest) {
                        scope.$digest();
                    }
                }

                function disableDigest() {
                    toggleWatchers(scope, false);
                }

                function enableDigest() {
                    toggleWatchers(scope, true);
                }

                if (!elementWatcher.isInViewport) {
                    scope.$evalAsync(disableDigest);
                    viewportUpdate();
                }

                elementWatcher.enterViewport(enableDigest);
                elementWatcher.exitViewport(disableDigest);

                scope.$on("toggleWatchers", function (event, enable) {
                    toggleWatchers(scope, enable);
                });

                scope.$on("$destroy", function () {
                    elementWatcher.destroy();
                    viewportUpdate();
                });
            }
        };
    }

    viewportWatch.$inject = [];

    angular.module("angularViewportWatch", [])
        .directive("viewportWatch", viewportWatch);
})();