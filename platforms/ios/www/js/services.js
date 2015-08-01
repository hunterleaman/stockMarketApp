angular.module('yourAppsName.services', [])


.constant('FIREBASE_URL', 'https://stockmarketapp-test.firebaseio.com/')


.service('modalService', function($ionicModal) {

  this.openModal = function(id) {

    var _this = this;

    if(id == 1) {
      $ionicModal.fromTemplateUrl('templates/search.html', {
        scope: null,
        controller: 'SearchCtrl'
      }).then(function(modal) {
        _this.modal = modal;
        _this.modal.show();
      });
    }

    else if(id == 2) {
      $ionicModal.fromTemplateUrl('templates/login.html', {
        scope: null,
        controller: 'LoginSignupCtrl'
      }).then(function(modal) {
        _this.modal = modal;
        _this.modal.show();
      });
    }

    else if(id == 3) {
      $ionicModal.fromTemplateUrl('templates/signup.html', {
        scope: null,
        controller: 'LoginSignupCtrl'
      }).then(function(modal) {
        _this.modal = modal;
        _this.modal.show();
      });
    }
  };

  this.closeModal = function() {

    var _this = this;

    if(!_this.modal) return;
    _this.modal.hide();
    _this.modal.remove();
  };
})


.factory('firebaseRef', function($firebase, FIREBASE_URL) {

  var firebaseRef = new Firebase(FIREBASE_URL);

  return firebaseRef;
})


.factory('firebaseUserRef', function(firebaseRef) {

  var userRef = firebaseRef.child('users');

  return userRef;
})


.factory('userService', function($rootScope, $window, $timeout, firebaseRef, firebaseUserRef, myStocksArrayService, myStocksCacheService, notesCacheService, modalService) {

  var login = function(user, signup) {

    firebaseRef.authWithPassword({
      email    : user.email,
      password : user.password
    }, function(error, authData) {
      if (error) {
        console.log("Login Failed!", error);
      }
      else {
        $rootScope.currentUser = user;

        if(signup) {
          modalService.closeModal();
        }
        else {
          console.log(authData);
          myStocksCacheService.removeAll();
          notesCacheService.removeAll();

          loadUserData(authData);

          modalService.closeModal();
          $timeout(function() {
            $window.location.reload(true);
          }, 400);
        }
      }
    });
  };

  var signup = function(user) {

    firebaseRef.createUser({
      email    : user.email,
      password : user.password
    }, function(error, userData) {
      if (error) {
        console.log("Error creating user:", error);
      }
      else {
        login(user, true);
        firebaseRef.child('emails').push(user.email);
        firebaseUserRef.child(userData.uid).child('stocks').set(myStocksArrayService);

        var stocksWithNotes = notesCacheService.keys();

        stocksWithNotes.forEach(function(stockWithNotes) {
          var notes = notesCacheService.get(stockWithNotes);
          notes.forEach(function(note) {
            firebaseUserRef.child(userData.uid).child('notes').child(note.ticker).push(note);
          });
        });
      }
    });
  };

  var logout = function() {
    firebaseRef.unauth();
    notesCacheService.removeAll();
    myStocksCacheService.removeAll();
    $window.location.reload(true);
    $rootScope.currentUser = '';
  };

  var updateStocks = function(stocks) {
    firebaseUserRef.child(getUser().uid).child('stocks').set(stocks);
  };

  var updateNotes = function(ticker, notes) {
    firebaseUserRef.child(getUser().uid).child('notes').child(ticker).remove();
    notes.forEach(function(note) {
      firebaseUserRef.child(getUser().uid).child('notes').child(note.ticker).push(note);
    });
  };

  var loadUserData = function(authData) {

    firebaseUserRef.child(authData.uid).child('stocks').once('value', function(snapshot) {
      var stocksFromDatabase = [];

      snapshot.val().forEach(function(stock) {
        var stockToAdd = {ticker: stock.ticker};
        stocksFromDatabase.push(stockToAdd);
      });
      myStocksCacheService.put('myStocks', stocksFromDatabase);
    },
    function(error) {
      console.log("Firebase error -> stocks: " + error);
    });

    firebaseUserRef.child(authData.uid).child('notes').once('value', function(snapshot) {

      snapshot.forEach(function(stocksWithNotes) {
        var notesFromDatabse = [];

        stocksWithNotes.forEach(function(note) {
          notesFromDatabse.push(note.val());
          var cacheKey = note.child('ticker').val();
          notesCacheService.put(cacheKey, notesFromDatabse);
        });
      });
    },
    function(error) {
      console.log("Firebase error –> notes: " + error);
    });
  };

  var getUser = function() {
    return firebaseRef.getAuth();
  };

  if(getUser()) {
    $rootScope.currentUser = getUser();
  }

  return {
    login: login,
    signup: signup,
    logout: logout,
    updateStocks: updateStocks,
    updateNotes: updateNotes,
    getUser: getUser
  };

})


.factory('encodeURIService', function() {
  return {
    encode: function(string) {
      return encodeURIComponent(string).replace(/\"/g, "%22").replace(/\ /g, "%20").replace(/[!'()]/g, escape);
    }
  };
})


.factory('dateService', function($filter) {

  var currentDate = function() {
    var d = new Date();
    var date = $filter('date')(d, 'yyyy-MM-dd');
    return date;
  };

  var oneYearAgoDate = function() {
    var d = new Date(new Date().setDate(new Date().getDate() - 365));
    var date = $filter('date')(d, 'yyyy-MM-dd');
    return date;
  };

  return {
    currentDate: currentDate,
    oneYearAgoDate: oneYearAgoDate
  };
})


.factory('fillMyStocksCacheService', function(CacheFactory) {

  var myStocksCache;

  if(!CacheFactory.get('myStocksCache')) {
    myStocksCache = CacheFactory('myStocksCache', {
      storageMode: 'localStorage'
    });
  }
  else {
    myStocksCache = CacheFactory.get('myStocksCache');
  }

  var fillMyStocksCache = function() {

    var myStocksArray = [
        {ticker: "AAPL"},
        {ticker: "GPRO"},
        {ticker: "FB"},
        {ticker: "NFLX"},
        {ticker: "TSLA"},
        {ticker: "BRK-A"},
        {ticker: "INTC"},
        {ticker: "MSFT"},
        {ticker: "GE"},
        {ticker: "BAC"},
        {ticker: "C"},
        {ticker: "T"}
    ];

    myStocksCache.put('myStocks', myStocksArray);
  };

  return {
    fillMyStocksCache: fillMyStocksCache
  };
})


.factory('myStocksCacheService', function(CacheFactory) {

  var myStocksCache = CacheFactory.get('myStocksCache');

  return myStocksCache;
})


.factory('myStocksArrayService', function(fillMyStocksCacheService, myStocksCacheService) {

  if(!myStocksCacheService.info('myStocks')) {
    fillMyStocksCacheService.fillMyStocksCache();
  }

  myStocks = myStocksCacheService.get('myStocks');
  return myStocks;
})


.factory('chartDataCacheService', function(CacheFactory) {

  var chartDataCache;

  if(!CacheFactory.get('chartDataCache')) {

    chartDataCache = CacheFactory('chartDataCache', {
      maxAge: 60 * 60 * 8 * 1000,
      deleteOnExpire: 'aggressive',
      storageMode: 'localStorage'
    });
  }
  else {
    chartDataCache = CacheFactory.get('chartDataCache');
  }

  return chartDataCache;
})


.factory('stockDetailsCacheService', function(CacheFactory) {

  var stockDetailsCache;

  if(!CacheFactory.get('stockDetailsCache')) {
    stockDetailsCache = CacheFactory('stockDetailsCache', {
      maxAge: 600 * 1000,
      deleteOnExpire: 'aggressive',
      storageMode: 'localStorage'
    });
  }
  else {
    stockDetailsCache = CacheFactory.get('stockDetailsCache');
  }

  return stockDetailsCache;
})


.factory('stockPriceCacheService', function(CacheFactory) {  //1x

  var stockPriceCache;                                       //1x

  if(!CacheFactory.get('stockPriceCache')) {                 //1x
    stockPriceCache = CacheFactory('stockPriceCache', {      //2x
      maxAge: 500 * 1000,                                             //5 * 1000
      deleteOnExpire: 'aggressive',
      storageMode: 'localStorage'
    });
  }
  else {
    stockPriceCache = CacheFactory.get('stockPriceCache');    //2x
  }

  return stockPriceCache;                                     //1x

})


.factory('notesCacheService', function(CacheFactory) {

  var notesCache;

  if(!CacheFactory.get('notesCache')) {
    notesCache = CacheFactory('notesCache', {
      storageMode: 'localStorage'
    });
  }
  else {
    notesCache = CacheFactory.get('notesCache');
  }

  return notesCache;
})


.factory('followStockService', function(myStocksArrayService, myStocksCacheService, userService) {

  return {

    follow: function(ticker) {

      var stockToAdd = {"ticker": ticker};

      myStocksArrayService.push(stockToAdd);
      myStocksCacheService.put('myStocks', myStocksArrayService);

      if(userService.getUser()) {
        userService.updateStocks(myStocksArrayService);
      }
    },

    unfollow: function(ticker) {

      for (var i = 0; i < myStocksArrayService.length; i++) {
        if(myStocksArrayService[i].ticker == ticker) {

          myStocksArrayService.splice(i, 1);
          myStocksCacheService.remove('myStocks');
          myStocksCacheService.put('myStocks', myStocksArrayService);

          if(userService.getUser()) {
            userService.updateStocks(myStocksArrayService);
          }

          break;
        }
      }
    },

    checkFollowing: function(ticker) {

      for (var i = 0; i < myStocksArrayService.length; i++) {
        if(myStocksArrayService[i].ticker == ticker) {
          return true;
        }
      }
      return false;
    }
  };

})


.factory('stockDataService', function($q, $http, encodeURIService, stockDetailsCacheService, stockPriceCacheService) {

  stockDetailsCacheService.setOptions({
    onExpire: function(key, value) {
      getDetailsData(key)
        .then(function() {
        }, function() {
          stockDetailsCacheService.put(key, value);
        });
    }
  });

  stockPriceCacheService.setOptions({                 //1x
    onExpire: function(key, value) {
      getPriceData(key)                               //1x
        .then(function() {
        }, function() {
          stockPriceCacheService.put(key, value);     //1x
        });
    }
  });

  var getDetailsData = function(ticker) {

    var deferred = $q.defer(),

    cacheKey = ticker,
    stockDetailsCache = stockDetailsCacheService.get(cacheKey),

    query = 'select * from yahoo.finance.quotes where symbol IN ("' + ticker + '")',
    url = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIService.encode(query) + '&format=json&env=http://datatables.org/alltables.env';

    if(stockDetailsCache) {
      deferred.resolve(stockDetailsCache);
    }
    else {
      $http.get(url)
        .success(function(json){
          var jsonData = json.query.results.quote;
          deferred.resolve(jsonData);
          stockDetailsCacheService.put(cacheKey, jsonData);
        })
        .error(function(error) {
          console.log("Details data error: " + error);
          deferred.reject();
        });
      }

    return deferred.promise;
  };

  var getPriceData = function(ticker) {

    var deferred = $q.defer(),

    cacheKey = ticker,
    stockPriceCache = stockPriceCacheService.get(cacheKey),

    url = "http://finance.yahoo.com/webservice/v1/symbols/" + ticker + "/quote?format=json&view=detail";

    if(stockPriceCache) {
      deferred.resolve(stockPriceCache);
    }
    else {
      $http.get(url)
        .success(function(json){
          var jsonData = json.list.resources[0].resource.fields;
          deferred.resolve(jsonData);
          stockPriceCacheService.put(cacheKey, jsonData);
        })
        .error(function(error) {
          console.log("Price data error: " + error);
          deferred.reject();
        });
    }

    return deferred.promise;
  };

  return {
    getPriceData: getPriceData,
    getDetailsData: getDetailsData
  };
})


.factory('chartDataService', function($q, $http, encodeURIService, chartDataCacheService) {

  var getHistoricalData = function(ticker, fromDate, todayDate) {

    var deferred = $q.defer(),

    cacheKey = ticker,
    chartDataCache = chartDataCacheService.get(cacheKey),

    query = 'select * from yahoo.finance.historicaldata where symbol = "' + ticker + '" and startDate = "' + fromDate + '" and endDate = "' + todayDate + '"',
    url = 'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIService.encode(query) + '&format=json&env=http://datatables.org/alltables.env';

    if(chartDataCache) {
      deferred.resolve(chartDataCache);
    }
    else {
      $http.get(url)
        .success(function(json) {
          var jsonData = json.query.results.quote;

          var priceData = [],
          volumeData = [];

          jsonData.forEach(function(dayDataObject) {

            var dateToMillis = dayDataObject.Date,
            date = Date.parse(dateToMillis),
            price = parseFloat(Math.round(dayDataObject.Close * 100) / 100).toFixed(3),
            volume = dayDataObject.Volume,

            volumeDatum = '[' + date + ',' + volume + ']',
            priceDatum = '[' + date + ',' + price + ']';

            volumeData.unshift(volumeDatum);
            priceData.unshift(priceDatum);
          });

          var formattedChartData =
          '[{' +
            '"key":' + '"volume",' +
            '"bar":' + 'true,' +
            '"values":' + '[' + volumeData + ']' +
          '},' +
          '{' +
            '"key":' + '"' + ticker + '",' +
            '"values":' + '[' + priceData + ']' +
          '}]';

          deferred.resolve(formattedChartData);
          chartDataCacheService.put(cacheKey, formattedChartData);
        })
        .error(function(error) {
          console.log("Chart data error: " + error);
          deferred.reject();
        });
    }

    return deferred.promise;
  };

  return {
    getHistoricalData: getHistoricalData
  };
})


.factory('notesService', function(notesCacheService, userService) {

  return {
    getNotes: function(ticker) {
      return notesCacheService.get(ticker);
    },

    addNote: function(ticker, note) {

      var stockNotes = [];

      if(notesCacheService.get(ticker)) {
        stockNotes = notesCacheService.get(ticker);
        stockNotes.push(note);
      }
      else {
        stockNotes.push(note);
      }

      notesCacheService.put(ticker, stockNotes);

      if(userService.getUser()) {
        var notes = notesCacheService.get(ticker);
        userService.updateNotes(ticker, stockNotes);
      }
    },

    deleteNote: function(ticker, index) {

      var stockNotes = [];

      stockNotes = notesCacheService.get(ticker);
      stockNotes.splice(index, 1);
      notesCacheService.put(ticker, stockNotes);

      if(userService.getUser()) {
        var notes = notesCacheService.get(ticker);
        userService.updateNotes(ticker, stockNotes);
      }
    }
  };
})


.factory('newsService', function($q, $http) {

  return {

    getNews: function(ticker) {

      var deferred = $q.defer(),

      x2js = new X2JS(),

      url = "http://finance.yahoo.com/rss/headline?s=" + ticker;

      $http.get(url)
        .success(function(xml) {
          var xmlDoc = x2js.parseXmlString(xml),
          json = x2js.xml2json(xmlDoc),
          jsonData = json.rss.channel.item;
          deferred.resolve(jsonData);
        })
        .error(function(error) {
          deferred.reject();
          console.log("News error: " + error);
        });

      return deferred.promise;
    }
  };
})


.factory('searchService', function($q, $http) {

  return {

    search: function(query) {

      var deferred = $q.defer(),

      url = 'http://d.yimg.com/autoc.finance.yahoo.com/autoc?query="' + query + '"&callback=YAHOO.Finance.SymbolSuggest.ssCallback',

      YAHOO = window.YAHOO = {
        Finance: {
          SymbolSuggest: {}
        }
      };

      YAHOO.Finance.SymbolSuggest.ssCallback = function(data) {
        var jsonData = data.ResultSet.Result;
        deferred.resolve(jsonData);
      };

      $http.jsonp(url)
        .then(YAHOO.Finance.SymbolSuggest.ssCallback);

      return deferred.promise;
    }
  };
})


;
