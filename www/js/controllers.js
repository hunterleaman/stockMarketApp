angular.module('yourAppsName.controllers', [])


.controller('AppCtrl', ['$scope', 'modalService', 'userService',
  function($scope, modalService, userService) {

    $scope.modalService = modalService;

    $scope.logout = function() {
      userService.logout();
    };

}])



.controller('MyStocksCtrl', ['$scope', 'myStocksArrayService', 'stockDataService', 'stockPriceCacheService', 'followStockService',
  function($scope, myStocksArrayService, stockDataService, stockPriceCacheService, followStockService) {

    $scope.$on("$ionicView.afterEnter", function() {
      $scope.getMyStocksData();
    });

    $scope.getMyStocksData = function() {

      myStocksArrayService.forEach(function(stock) {

        var promise = stockDataService.getPriceData(stock.ticker);

        $scope.myStocksData = [];

        promise.then(function(data) {
          $scope.myStocksData.push(stockPriceCacheService.get(data.symbol));
        });
      });

      $scope.$broadcast('scroll.refreshComplete');
    };

    $scope.unfollowStock = function(ticker) {
      followStockService.unfollow(ticker);
      $scope.getMyStocksData();
    };
}])



.controller('StockCtrl', ['$scope', '$stateParams', '$window', '$ionicPopup', 'followStockService', 'stockDataService', 'chartDataService', 'dateService', 'notesService', 'newsService',
  function($scope, $stateParams, $window, $ionicPopup, followStockService, stockDataService, chartDataService, dateService, notesService, newsService) {

    $scope.ticker = $stateParams.stockTicker;
    $scope.stockNotes = [];

    $scope.following = followStockService.checkFollowing($scope.ticker);
    $scope.oneYearAgoDate = dateService.oneYearAgoDate();
    $scope.todayDate = dateService.currentDate();

    // default chart setting
    $scope.chartView = 4;


    $scope.$on("$ionicView.afterEnter", function() {
      getPriceData();
      getDetailsData();
      getChartData();
      getNews();
      $scope.stockNotes = notesService.getNotes($scope.ticker);
    });


    $scope.chartViewFunc = function(n) {
      $scope.chartView = n;
    };

    $scope.toggleFollow = function() {
      if($scope.following) {
        followStockService.unfollow($scope.ticker);
        $scope.following = false;
      }
      else {
        followStockService.follow($scope.ticker);
        $scope.following = true;
      }
    };

    $scope.openWindow = function(link) {
      //TODO install and set up inAppBrowser
      console.log("openWindow –> " + link);
    };

    $scope.addNote = function() {
      $scope.note = {title: 'Note', body: '', date: $scope.todayDate, ticker: $scope.ticker};

      var note = $ionicPopup.show({
        template: '<input type="text" ng-model="note.title" id="stock-note-title"><textarea type="text" ng-model="note.body" id="stock-note-body"></textarea>',
        title: 'New Note for ' + $scope.ticker,
        scope: $scope,
        buttons: [
          {
            text: 'Cancel',
            onTap: function(e) {
              return;
            }
           },
          {
            text: '<b>Save</b>',
            type: 'button-balanced',
            onTap: function(e) {
              notesService.addNote($scope.ticker, $scope.note);
            }
          }
        ]
      });

      note.then(function(res) {
        $scope.stockNotes = notesService.getNotes($scope.ticker);
      });
    };

    $scope.openNote = function(index, title, body) {
      $scope.note = {title: title, body: body, date: $scope.todayDate, ticker: $scope.ticker};

      var note = $ionicPopup.show({
        template: '<input type="text" ng-model="note.title" id="stock-note-title"><textarea type="text" ng-model="note.body" id="stock-note-body"></textarea>',
        title: $scope.note.title,
        scope: $scope,
        buttons: [
          {
            text: 'Delete',
            type: 'button-assertive button-small',
            onTap: function(e) {
              notesService.deleteNote($scope.ticker, index);
            }
          },
          {
            text: 'Cancel',
            type: 'button-small',
            onTap: function(e) {
              return;
            }
           },
          {
            text: '<b>Save</b>',
            type: 'button-balanced button-small',
            onTap: function(e) {
              notesService.deleteNote($scope.ticker, index);
              notesService.addNote($scope.ticker, $scope.note);
            }
          }
        ]
      });

      note.then(function(res) {
        $scope.stockNotes = notesService.getNotes($scope.ticker);
      });
    };


    function getPriceData() {

      var promise = stockDataService.getPriceData($scope.ticker);

      promise.then(function(data) {
        $scope.stockPriceData = data;

        if(data.chg_percent >= 0 && data !== null) {
          $scope.reactiveColor = {'background-color': '#33cd5f', 'border-color': 'rgba(255,255,255,.3)'};
        }
        else if(data.chg_percent < 0 && data !== null) {
          $scope.reactiveColor = {'background-color' : '#ef473a', 'border-color': 'rgba(0,0,0,.2)'};
        }
      });
    }

    function getDetailsData() {

      var promise = stockDataService.getDetailsData($scope.ticker);

      promise.then(function(data) {
        $scope.stockDetailsData = data;
      });
    }

    function getChartData() {

      var promise = chartDataService.getHistoricalData($scope.ticker, $scope.oneYearAgoDate, $scope.todayDate);

      promise.then(function(data) {

        $scope.myData = JSON.parse(data)
        	.map(function(series) {
        		series.values = series.values.map(function(d) { return {x: d[0], y: d[1] }; });
        		return series;
        	});
      });
    }

    function getNews() {

      $scope.newsStories = [];

      var promise = newsService.getNews($scope.ticker);

      promise.then(function(data) {
        $scope.newsStories = data;
      });
    }


    // chart option functions
    // top chart x axis
  	var xTickFormat = function(d) {
  		var dx = $scope.myData[0].values[d] && $scope.myData[0].values[d].x || 0;
  		if (dx > 0) {
        return d3.time.format("%b %d")(new Date(dx));
  		}
  		return null;
  	};

    // bottom chart x axis
    var x2TickFormat = function(d) {
      var dx = $scope.myData[0].values[d] && $scope.myData[0].values[d].x || 0;
      return d3.time.format('%b %Y')(new Date(dx));
    };


    var y1TickFormat = function(d) {
      return d3.format(',f')(d);
    };

    // top chart y axis price
    var y2TickFormat = function(d) {
      return d3.format('s')(d);
    };

    // bottom chart y axis volume
    var y3TickFormat = function(d) {
      return d3.format(',.2s')(d);
    };

    var y4TickFormat = function(d) {
      return d3.format(',.2s')(d);
    };

    var xValueFunction = function(d, i) {
      return i;
    };

    var marginBottom = ($window.innerWidth / 100) * 10;

  	$scope.chartOptions = {
      chartType: 'linePlusBarWithFocusChart',
      data: 'myData',
      margin: {top: 15, right: 0, bottom: marginBottom, left: 0},
      interpolate: "cardinal",
      useInteractiveGuideline: false,
      yShowMaxMin: false,
      tooltips: false,
      showLegend: false,
      useVoronoi: false,
      xShowMaxMin: false,
      xValue: xValueFunction,
      xAxisTickFormat: xTickFormat,
      x2AxisTickFormat: x2TickFormat,
      y1AxisTickFormat: y1TickFormat,
      y2AxisTickFormat: y2TickFormat,
      y3AxisTickFormat: y3TickFormat,
      y4AxisTickFormat: y4TickFormat,
      transitionDuration: 500
  	};

}])



.controller('SearchCtrl', ['$scope', '$state', 'modalService', 'searchService',
  function($scope, $state, modalService, searchService) {

    $scope.closeModal = function() {
      modalService.closeModal();
    };

    $scope.search = function() {
      $scope.searchResults = '';
      startSearch($scope.searchQuery);
    };

    var startSearch = ionic.debounce(function(query) {
      searchService.search(query)
        .then(function(data) {
          $scope.searchResults = data;
        });
    }, 400);

    $scope.goToStock = function(ticker) {
      modalService.closeModal();
      $state.go('app.stock', {stockTicker: ticker});
    };
}])



.controller('LoginSignupCtrl', ['$scope', 'modalService', 'userService',
  function($scope, modalService, userService) {

    $scope.user = {email: '', password: ''};

    $scope.closeModal = function() {
      modalService.closeModal();
    };

    $scope.signup = function(user) {
      userService.signup(user);
    };

    $scope.login = function(user) {
      userService.login(user);
    };
}])

;
