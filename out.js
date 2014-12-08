(function() {
  'use strict';
  var Schema, User, db, fs, mongoose, pushDB, startStream, tweetSchema, twitter, userName, weekday;

  fs = require("fs");

  twitter = require("twitter");

  mongoose = require("mongoose");

  db = mongoose.connect("mongodb://localhost/fullstack-dev");

  userName = "";

  weekday = new Array(7);

  weekday[0] = "Sunday";

  weekday[1] = "Monday";

  weekday[2] = "Tuesday";

  weekday[3] = "Wednesday";

  weekday[4] = "Thursday";

  weekday[5] = "Friday";

  weekday[6] = "Saturday";

  Schema = mongoose.Schema;

  tweetSchema = new Schema({
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

  mongoose.model("tweetData", tweetSchema);

  User = mongoose.model("tweetData");

  fs.readFile("./keys.txt", "utf8", function(err, text) {
    var keys, userKeys;
    if (err !== null) {
      return 0;
    }
    keys = text.split("\n");
    userName = keys[0];
    userKeys = new twitter({
      consumer_key: keys[1],
      consumer_secret: keys[2],
      access_token_key: keys[3],
      access_token_secret: keys[4]
    });
    startStream(userKeys);
  });

  startStream = function(userStream) {
    userStream.stream("user", function(stream) {
      stream.on("data", function(data) {
        var DD, day, hours, inputData, minutes, month, obj, place, placeText, splitText, text, tmpStr1, u;
        if (data.user != null) {
          DD = new Date();
          month = DD.getMonth() + 1;
          day = DD.getDate();
          hours = DD.getHours();
          minutes = DD.getMinutes();
          fs.appendFile("log.txt", month + "/" + day + " " + hours + ":" + minutes + " " + data.user.screen_name + "\n");
          DD = null;
        }
        if ((data.user == null) || data.user.screen_name !== userName) {
          return;
        }
        text = ("text" in data ? data.text : "");
        obj = {};
        inputData = function(obj) {
          var hour, min, now, sec, tmpData, toDoubleDigits, year;
          toDoubleDigits = function(num) {
            num += "";
            if (num.length === 1) {
              num = "0" + num;
            }
            return num;
          };
          tmpData = {};
          tmpData.screenName = data.user.screen_name;
          tmpData.tweet = obj.tweet;
          tmpData.place = obj.place;
          tmpData.memo = obj.memo;
          now = new Date();
          year = now.getFullYear();
          month = toDoubleDigits(now.getMonth() + 1);
          day = toDoubleDigits(now.getDate());
          hour = toDoubleDigits(now.getHours());
          min = toDoubleDigits(now.getMinutes());
          sec = toDoubleDigits(now.getSeconds());
          tmpData.time = hour + ":" + min + ":" + sec;
          tmpData.year = year;
          tmpData.month = month;
          tmpData.day = day;
          tmpData.weekday = weekday[now.getDay()];
          tmpData.prefecture = obj.prefecture;
          tmpData.img = obj.img;
          now = null;
          return tmpData;
        };
        if (text === "会社" || text === "出社") {
          obj.place = "Eyes, JAPAN";
          obj.tweet = text;
          obj.memo = "";
          obj.prefecture = "福島県 会津若松市";
          obj.img = "";
          pushDB(inputData(obj), userStream);
        } else if (text === "らぼ" || text === "ラボ") {
          obj.place = "画像処理学講座";
          obj.tweet = text;
          obj.memo = "";
          obj.prefecture = "福島県 会津大学";
          obj.img = "";
          pushDB(inputData(obj), userStream);
        } else if (text === "大学") {
          obj.place = "会津大学";
          obj.tweet = text;
          obj.memo = "";
          obj.prefecture = "福島県 会津大学";
          obj.img = "";
          pushDB(inputData(obj), userStream);
        } else if (text === "帰宅") {
          obj.place = "家(帰宅)";
          obj.tweet = text;
          obj.memo = "";
          obj.prefecture = "福島県 会津若松市";
          obj.img = "";
          pushDB(inputData(obj), userStream);
        } else if (text.indexOf("I'm at") !== -1) {
          splitText = text.split(" ");
          place = "";
          u = 2;
          while (u < splitText.length) {
            if (splitText[u][0] === "w" && splitText[u][1] === "/") {
              obj.prefecture = "";
              break;
            } else if (splitText[u] === "in") {
              placeText = splitText[u + 1].split(",");
              tmpStr1 = placeText[0];
              if (splitText[u + 2].indexOf("swarmapp") !== -1) {
                obj.prefecture = tmpStr1;
                break;
              } else {
                obj.prefecture = splitText[u + 2] + "," + tmpStr1;
                break;
              }
            }
            place += splitText[u];
            place += " ";
            u++;
          }
          obj.place = place;
          obj.tweet = text;
          obj.memo = "";
          obj.img = "";
          pushDB(inputData(obj), userStream);
        }
      });
    });
  };

  pushDB = function(data, userStream) {
    var user;
    user = new User();
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
      var randA, randB, randID, saveDB;
      saveDB = function() {
        user.save(function(err) {
          if (err) {
            console.log(err);
          }
          user = null;
        });
        updateTweet(userStream, "-" + user["_id"] + "  http://place.about-hiroppy.org" + user["place_id"]);
      };
      if (docs.length === 0) {
        randA = Math.floor(Math.random() * 999) + 1;
        randID = ("0000" + randA).slice(-4);
        randB = Math.floor(Math.random() * 999) + 1;
        randID += ("0000" + randB).slice(-4);
        user.place_id = randID;
        saveDB();
      } else {
        user.place_id = docs[0].place_id;
        saveDB();
      }
    });
  };

}).call(this);
