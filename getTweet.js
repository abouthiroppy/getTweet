////////       get tweet           //////
//          use userstream             //
/////////////////////////////////////////

var fs = require('fs');
var twitter = require('twitter');
var mongoose = require('mongoose');
var db = mongoose.connect('mongodb://localhost/fullstack-dev');
var userName = "";

var weekday = new Array(7);
weekday[0] = "Sunday";
weekday[1] = "Monday";
weekday[2] = "Tuesday";
weekday[3] = "Wednesday";
weekday[4] = "Thursday";
weekday[5] = "Friday";
weekday[6] = "Saturday";

//keyの読み込み
///////////////////////////////////

fs.readFile('./keys.txt', 'utf8', function(err, text) {
  if (err !== null) return 0;

  var keys = text.split('\n');
  userName = keys[0];
  var userKey = new twitter({
    consumer_key: keys[1],
    consumer_secret: keys[2],
    access_token_key: keys[3],
    access_token_secret: keys[4]
  });
  startStream(userKey);
});

///////////////////////////////////

//Schemaの定義
///////////////////////////////////
var Schema = mongoose.Schema;
var tweetSchema = new Schema({
  screen_name: String,
  tweet: String,
  place: String,
  memo: String,
  time: String,
  prefecture: String,
  year: String,
  month: String,
  day: String,
  weekday: String,
  img: String,
  place_id: String
});

mongoose.model('tweetData', tweetSchema);
var User = mongoose.model('tweetData');


////////////debug///////////////////
//findDB();
// dropDB();
////////////////////////////////////

function search(twit, d) { //dは最新
  twit.get("/statuses/show/" + d.in_reply_to_status_id_str + ".json", function(data) {

    if (data.user.screen_name != userName) return;
    if (data.text.split(' ')[1].indexOf('-') == -1) return;

    var DBid = data.text.split(' ')[1].substr(1);
    var user = new User();

    //parse
    var tweetText = d.text.split(' ');

    var imageUrlArray = [];
    var imageUrlFlag = false;

    if (tweetText.length <= 2) return;

    User.findOne({
      _id: DBid
    }, function(err, dbData) {
      if (err || dbData === null) {
        return;
      }
      for (var i = 1; i < tweetText.length; i++) {
        if (tweetText[i] == "n" || tweetText[i] == "N") dbData.place = tweetText[i + 1];
        if (tweetText[i] == "m" || tweetText[i] == "M") dbData.memo = tweetText[i + 1];
        else if (tweetText[i] == "i" || tweetText[i] == "I") {
          imageUrlFlag = true;
        } else if (tweetText[i] == "p" || tweetText[i] == "P") dbData.prefecture = tweetText[i + 1];
        //写真の場合
        if (tweetText[i].indexOf("http") !== -1 && imageUrlFlag) {
          imageUrlArray.push(tweetText[i]);
        }
      }

      var convertImageUrl = function(url) {
        var urlCnt = 1;
        if (url.length !== 1) {
          var tmpArray = [];
        }
        //twitpic
        var scraper = require('scraper');
        //console.log(url);
        scraper(url, function(err, $) {
          if (err) {
            throw err;
          }
          var realUrl = "";
          var cnt = 0;
          //console.log("inininin");
          $('#media img').each(function() {
            //console.log("cnt  " + cnt);
            if (cnt == 2) {
              if (url.length !== 1) {
                tmpArray.push($(this).attr("src"));
                // dbData.img.push($(this).attr("src"));
                // console.log("cnt  out " + urlCnt);
                if (url.length === urlCnt) {
                  dbData.img = tmpArray;
                  tmpArray = null;
                }
              } else {
                dbData.img = $(this).attr("src");
              }
            }
            cnt++;
          });
          urlCnt++;
        });
      }

      if (imageUrlArray.length === 0) {
        updateTweet(twit, "change status " + DBid + " " + Math.floor(Math.random() * 1000) + "-");
        dbData.save();
      } else {
        convertImageUrl(imageUrlArray);
        setTimeout(function() {
          console.log(dbData.img);
          updateTweet(twit, "change status " + DBid + " " + Math.floor(Math.random() * 1000) + "-");
          dbData.save();
        }, imageUrlArray.length * 7000);
      }
      user = null;
    });
  });
}

///////////////////////////////////

function startStream(userStream) {
  userStream.stream('user', function(stream) {

    stream.on('data', function(data) {
      console.log(data.text);
      //log
      if (data.user != undefined) {
        var DD = new Date();
        var month = DD.getMonth() + 1;
        var day = DD.getDate();
        var hours = DD.getHours();
        var minutes = DD.getMinutes();

        fs.appendFile('log.txt', month + "/" + day + " " + hours + ":" + minutes + " " + data.user.screen_name + "\n");
        DD = null;
      }

      //自分以外の発言を受け付けない
      if (data.user == undefined || data.user.screen_name != userName) return;
      var text = ('text' in data) ? data.text : '';

      //もしリプライが来たらそれは追加項目である可能性がある。
      if (data.in_reply_to_status_id_str != null) {
        search(userStream, data);
      }

      var obj = {};
      var inputData = function(obj) {
        var toDoubleDigits = function(num) {
          num += "";
          if (num.length === 1) {
            num = "0" + num;
          }
          return num;
        };

        var tmpData = {};
        tmpData.screenName = data.user.screen_name;
        tmpData.tweet = obj.tweet;
        tmpData.place = obj.place;
        tmpData.memo = obj.memo;
        var now = new Date();
        var year = now.getFullYear();
        var month = toDoubleDigits(now.getMonth() + 1);
        var day = toDoubleDigits(now.getDate());
        var hour = toDoubleDigits(now.getHours());
        var min = toDoubleDigits(now.getMinutes());
        var sec = toDoubleDigits(now.getSeconds());

        tmpData.time = hour + ":" + min + ":" + sec;
        tmpData.year = year;
        tmpData.month = month;
        tmpData.day = day;
        tmpData.weekday = weekday[now.getDay()];
        tmpData.prefecture = obj.prefecture;
        tmpData.img = obj.img;
        now = null;
        return tmpData;
      }

      if (text == "会社" || text == "出社") {
        obj.place = "Eyes, JAPAN";
        obj.tweet = text;
        obj.memo = "";
        obj.prefecture = "福島県 会津若松市";
        obj.img = "";
        pushDB(inputData(obj), userStream);
      } else if (text == "らぼ" || text == "ラボ") {
        obj.place = "画像処理学講座";
        obj.tweet = text;
        obj.memo = "";
        obj.prefecture = "福島県 会津大学";
        obj.img = "";
        pushDB(inputData(obj), userStream);
      } else if (text == "大学") {
        obj.place = "会津大学";
        obj.tweet = text;
        obj.memo = "";
        obj.prefecture = "福島県 会津大学";
        obj.img = "";
        pushDB(inputData(obj), userStream);
      } else if (text == "帰宅") {
        obj.place = "家(帰宅)";
        obj.tweet = text;
        obj.memo = "";
        obj.prefecture = "福島県 会津若松市";
        obj.img = "";
        pushDB(inputData(obj), userStream);
      }

      // swarmapp
      else if (text.indexOf("I'm at") != -1) {
        var splitText = text.split(' ');

        var place = "";
        for (var u = 2; u < splitText.length; u++) {
          //twitterユーザが複数人の時
          if (splitText[u][0] == 'w' && splitText[u][1] == '/') {
            obj.prefecture = "";
            break;
          }
          //一人の時は県、地名がtweetに入る
          else if (splitText[u] == 'in') {
            //地名
            var placeText = splitText[u + 1].split(',');
            var tmpStr1 = placeText[0];
            //県
            // var tmpStr2 = splitText[u+1].split(')');
            if (splitText[u + 2].indexOf('swarmapp') !== -1) {
              obj.prefecture = tmpStr1;
              break;
            } else {
              obj.prefecture = splitText[u + 2] + "," + tmpStr1;
              break;
            }
          }
          //場所が空白で区切られている場合はここに入る
          place += splitText[u];
          place += " ";
        }
        obj.place = place;
        obj.tweet = text;
        obj.memo = "";
        obj.img = "";

        pushDB(inputData(obj), userStream);
      }
    });
  });
}

function updateTweet(userStream, str) {
  //userStream.updateStatus('@'+userName+" "+str, function (data) {
  //});
}

function pushDB(data, userStream) {
  /*
      screen_name: String,
      tweet: String,
      place: String,
      memo: String,
      time: String,
      prefecture: String,
      year: String,
      month: String,
      day: String,
      weekday: String
    */

  var user = new User();
  user.screen_name = data.screenName;
  user.tweet = data.tweet;
  user.place = data.place;
  user.memo = data.memo;
  user.time = data.time;
  user.prefecture = data.prefecture;
  user.year = data.year;
  user.month = data.month;
  user.day = data.day;
  user.weekday = data.weekday;
  user.img = data.img;

  User.find({
    place: user.place
  }, function(err, docs) {

    var saveDB = function() {
      user.save(function(err) {
        if (err) {
          console.log(err);
        }
        user = null;
      });

      updateTweet(userStream, "-" + user["_id"] + "  http://place.about-hiroppy.org" + user["place_id"]);
    }

    if (docs.length == 0) {
      //place_idの設定
      var randA = Math.floor(Math.random() * 999) + 1;
      var randID = ('0000' + randA).slice(-4);
      var randB = Math.floor(Math.random() * 999) + 1;
      randID += ('0000' + randB).slice(-4);
      user.place_id = randID;

      saveDB();

    } else {
      user.place_id = docs[0].place_id;
      saveDB();
    }
  });
}


function findDB() {
  User.find({}, function(err, docs) {
    for (var i = 0, size = docs.length; i < size; ++i) {
      console.log(docs[i]);
    }
  });
}

function dropDB() {
  User.remove({}, function(err) {});
}


// jsonの作成
/*
function makingAPI() {
  var now = new Date();
  var month = now.getMonth() + 1;
  var data = [];
  // User.find({findDBIndex:month}, function(err, docs) {
  //   for (var i=0, size=docs.length; i<size; ++i) {
  //     data.push(docs[i]);
  //   }
  // });
  User.find({}, function(err, docs) {
    for (var i = 0, size = docs.length; i < size; ++i) {
      data.push(docs[i]);
    }
  });
  setTimeout(function() {
    fs.writeFile('../API/info.json', JSON.stringify(data), function(err) {
      console.log(err);
    });
  }, 2500);
}
*/