'use strict'

fs       = require("fs")
twitter  = require("twitter")
mongoose = require("mongoose")

db       = mongoose.connect("mongodb://localhost/fullstack-dev")
userName = ""

weekday    = new Array(7)
weekday[0] = "Sunday"
weekday[1] = "Monday"
weekday[2] = "Tuesday"
weekday[3] = "Wednesday"
weekday[4] = "Thursday"
weekday[5] = "Friday"
weekday[6] = "Saturday"

Schema      = mongoose.Schema
tweetSchema = new Schema(
  screen_name : String
  tweet       : String
  place       : String
  memo        : String
  time        : String
  prefecture  : String
  year        : String
  month       : String
  day         : String
  weekday     : String
  img         : String
  place_id    : String
)
mongoose.model "tweetData", tweetSchema
User = mongoose.model("tweetData")

fs.readFile "./keys.txt", "utf8", (err, text) ->
  return 0  if err isnt null

  keys     = text.split("\n")
  userName = keys[0]
  userKeys  = new twitter(
    consumer_key       : keys[1]
    consumer_secret    : keys[2]
    access_token_key   : keys[3]
    access_token_secret: keys[4]
  )
  startStream userKeys
  return



# search = (twit, d) -> #dは最新
#   twit.get "/statuses/show/" + d.in_reply_to_status_id_str + ".json", (data) ->
#     return  unless data.user.screen_name is userName
#     return  if data.text.split(" ")[1].indexOf("-") is -1
#     DBid = data.text.split(" ")[1].substr(1)
#     user = new User()

#     #parse
#     tweetText = d.text.split(" ")
#     imageUrlArray = []
#     imageUrlFlag = false
#     return  if tweetText.length <= 2
#     User.findOne
#       _id: DBid
#     , (err, dbData) ->
#       return  if err or dbData is null
#       i = 1

#       while i < tweetText.length
#         dbData.place = tweetText[i + 1]  if tweetText[i] is "n" or tweetText[i] is "N"
#         if tweetText[i] is "m" or tweetText[i] is "M"
#           dbData.memo = tweetText[i + 1]
#         else if tweetText[i] is "i" or tweetText[i] is "I"
#           imageUrlFlag = true
#         else dbData.prefecture = tweetText[i + 1]  if tweetText[i] is "p" or tweetText[i] is "P"

#         #写真の場合
#         imageUrlArray.push tweetText[i]  if tweetText[i].indexOf("http") isnt -1 and imageUrlFlag
#         i++

#       convertImageUrl = (url) ->
#         urlCnt = 1
#         tmpArray = []  if url.length isnt 1

#         #twitpic
#         scraper = require("scraper")

#         #console.log(url);
#         scraper url, (err, $) ->
#           throw err  if err
#           realUrl = ""
#           cnt = 0

#           #console.log("inininin");
#           $("#media img").each ->

#             #console.log("cnt  " + cnt);
#             if cnt is 2
#               if url.length isnt 1
#                 tmpArray.push $(this).attr("src")

#                 # dbData.img.push($(this).attr("src"));
#                 # console.log("cnt  out " + urlCnt);
#                 if url.length is urlCnt
#                   dbData.img = tmpArray
#                   tmpArray = null
#               else
#                 dbData.img = $(this).attr("src")
#             cnt++
#             return

#           urlCnt++
#           return

#         return

#       if imageUrlArray.length is 0
#         updateTweet twit, "change status " + DBid + " " + Math.floor(Math.random() * 1000) + "-"
#         dbData.save()
#       else
#         convertImageUrl imageUrlArray
#         setTimeout (->
#           console.log dbData.img
#           updateTweet twit, "change status " + DBid + " " + Math.floor(Math.random() * 1000) + "-"
#           dbData.save()
#           return
#         ), imageUrlArray.length * 7000
#       user = null
#       return

#     return

#   return

startStream = (userStream) ->
  userStream.stream "user", (stream) ->
    stream.on "data", (data) ->
      if data.user?
        DD = new Date()
        month = DD.getMonth() + 1
        day = DD.getDate()
        hours = DD.getHours()
        minutes = DD.getMinutes()
        fs.appendFile "log.txt", month + "/" + day + " " + hours + ":" + minutes + " " + data.user.screen_name + "\n"
        DD = null

      #自分以外の発言を受け付けない
      return  if not data.user? or data.user.screen_name isnt userName
      text = (if ("text" of data) then data.text else "")

      #もしリプライが来たらそれは追加項目である可能性がある。
      # search userStream, data  if data.in_reply_to_status_id_str?
      obj = {}
      inputData = (obj) ->
        toDoubleDigits = (num) ->
          num += ""
          num  = "0" + num  if num.length is 1
          num

        tmpData            = {}
        tmpData.screenName = data.user.screen_name
        tmpData.tweet      = obj.tweet
        tmpData.place      = obj.place
        tmpData.memo       = obj.memo

        now   = new Date()
        year  = now.getFullYear()
        month = toDoubleDigits now.getMonth() + 1
        day   = toDoubleDigits now.getDate()
        hour  = toDoubleDigits now.getHours()
        min   = toDoubleDigits now.getMinutes()
        sec   = toDoubleDigits now.getSeconds()

        tmpData.time       = hour + ":" + min + ":" + sec
        tmpData.year       = year
        tmpData.month      = month
        tmpData.day        = day
        tmpData.weekday    = weekday[now.getDay()]
        tmpData.prefecture = obj.prefecture
        tmpData.img        = obj.img
        now = null
        tmpData

      if text is "会社" or text is "出社"
        obj.place = "Eyes, JAPAN"
        obj.tweet = text
        obj.memo = ""
        obj.prefecture = "福島県 会津若松市"
        obj.img = ""
        pushDB inputData(obj), userStream
      else if text is "らぼ" or text is "ラボ"
        obj.place = "画像処理学講座"
        obj.tweet = text
        obj.memo = ""
        obj.prefecture = "福島県 会津大学"
        obj.img = ""
        pushDB inputData(obj), userStream
      else if text is "大学"
        obj.place = "会津大学"
        obj.tweet = text
        obj.memo = ""
        obj.prefecture = "福島県 会津大学"
        obj.img = ""
        pushDB inputData(obj), userStream
      else if text is "帰宅"
        obj.place = "家(帰宅)"
        obj.tweet = text
        obj.memo = ""
        obj.prefecture = "福島県 会津若松市"
        obj.img = ""
        pushDB inputData(obj), userStream

      # swarmapp
      else unless text.indexOf("I'm at") is -1
        splitText = text.split(" ")
        place = ""
        u = 2

        while u < splitText.length

          #twitterユーザが複数人の時
          if splitText[u][0] is "w" and splitText[u][1] is "/"
            obj.prefecture = ""
            break

          #一人の時は県、地名がtweetに入る
          else if splitText[u] is "in"

            #地名
            placeText = splitText[u + 1].split(",")
            tmpStr1 = placeText[0]

            #県
            if splitText[u + 2].indexOf("swarmapp") isnt -1
              obj.prefecture = tmpStr1
              break
            else
              obj.prefecture = splitText[u + 2] + "," + tmpStr1
              break

          #場所が空白で区切られている場合はここに入る
          place += splitText[u]
          place += " "
          u++
        obj.place = place
        obj.tweet = text
        obj.memo = ""
        obj.img = ""
        pushDB inputData(obj), userStream
      return
    return
  return

# updateTweet = (userStream, str) ->
# #userStream.updateStatus('@'+userName+" "+str, function (data) {
# #});

pushDB = (data, userStream) ->
  user = new User()
  user.screen_name = data.screenName
  user.tweet = data.tweet
  user.place = data.place
  user.memo = data.memo
  user.time = data.time
  user.prefecture = data.prefecture
  user.year = data.year
  user.month = data.month
  user.day = data.day
  user.weekday = data.weekday
  user.img = data.img
  User.find
    place: user.place
  , (err, docs) ->
    saveDB = ->
      user.save (err) ->
        console.log err  if err
        user = null
        return

      updateTweet userStream, "-" + user["_id"] + "  http://place.about-hiroppy.org" + user["place_id"]
      return

    if docs.length is 0

      #place_idの設定
      randA = Math.floor(Math.random() * 999) + 1
      randID = ("0000" + randA).slice(-4)
      randB = Math.floor(Math.random() * 999) + 1
      randID += ("0000" + randB).slice(-4)
      user.place_id = randID
      saveDB()
    else
      user.place_id = docs[0].place_id
      saveDB()
    return

  return

# findDB = ->
#   User.find {}, (err, docs) ->
#     i = 0
#     size = docs.length

#     while i < size
#       console.log docs[i]
#       ++i
#     return

#   return
# dropDB = ->
#   User.remove {}, (err) ->

#   return