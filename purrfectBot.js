// ---------------------------------------------------------------------------------------
//										API
// ---------------------------------------------------------------------------------------

//Twitter API, you need a developer key for this
var Twit = require('twit'); 
//The config file should be kept in the same directory as the bot
//There you will put your consumer and access keys
var T = new Twit(require('./config.js'));

//Jimp is an open-source API avaiable from npmjs.com
//It allows for on the fly image manipulation
//We are going to use it for photo manipulation
var Jimp = require('jimp');

//This is a standard file input/output API that comes with node.js
var fs = require('fs');



// ---------------------------------------------------------------------------------------
//										Global Variables & Constants
// ---------------------------------------------------------------------------------------
//Typically we don't use global variables in node.js
//This is because functions run concurrently and can be interacting with the same data
//We keep our variables oranized though so the only thing we watch out for is file I/O
var searchPhrases = [//These are the search phrases we are gonna say when looking for art
	"I am Meowt on the prowl for purrrrfect art", 
	"There are some pawsitively terrific portraits out there tonight",
	"These artist sure have purrsonality", 
	"Searching all paw-kets of the internet for some nice art",
	"Hopefully we find some nice pawtraits tonight",
	"Pursuing the greatest finds","Purrrrrusing a fine selection",
	"Like these tweets if you find them pawsitively interesting",
	"I'm feline my way through these posts",
	"It's siamese-y to find good artist",
	"Losing a piece would be a cat-astrophe"
	];
var searchSize = searchPhrases.length;
//These is an array of our different search queries that we are going to pull from
//@param q: The text you want to search for. Extended by filter: to choose what type of tweet you want
//@param count: The amount of tweets you want to request from the server 
//@param result_type: The type of tweets you want [popular, recent, mixed]
//@param since_id: Only grab tweets from after this id;
var curatingSearches = [	
	{q: "#myFirstTweet filter:media", count: 50, result_type: "recent", since_id: undefined},
	{q: "#amateurphotography filter:media", count: 50, result_type: "recent", since_id: undefined},
	{q: "#digitalArt filter:media", count: 50, result_type: "recent", since_id: undefined},
	{q: "#cats filter:media", count: 50, result_type: "recent", since_id: undefined}
];
var curateSize = curatingSearches.length;
//In order to keep variety in our tweets we gotta have varied hashtags
var searchHashtags_One = [
	"#CuratorCat", "#CuriousKitties", "#WanderingInterwebs", "#Pawing&#Clawing",
	"#BuildingCommunity"
	];
var searchH1Size = searchHashtags_One.length;

//This hashtag is going to be related to which search query we chose
var searchHashtags_Two = [
	"#myFirstTweet", "#amateurphotography", "#digitalArt", "#cats"
];

//This is another random hashtag to throw on for more combinations
var searchHashtags_Three = [
	"#PurrfectDay", "#BotLife", "#SharpeningClaws", "#HarrasingGuests",
	"#AdmiringPieces", "#ReadingNews"
];
var searchH3Size = searchHashtags_Three.length;
//This is the beginning section of the curate phrase 
var curatePhrase_Pre = [
	"A purrrrfect piece by: ",
	"Here is a wonderful addition to the gallery by: "
];
var curatePSize = curatePhrase_Pre.length;

//These are the musuem names we are going to steal... retweet from
var musuemsNames = [
	"@smithsonian", "@MuseumModernArt", "@HighMuseumofArt", "@Guggenheim"
];
var museumSize = musuemsNames.length;
//This variable is going to hold an array of latest trending topics to share with followers
//We initialize it out here because we are going to request the tweets from twitters API
//And we want to use safety checks to prevent our bot from crashing
var twitTrends;
var trendsSize;

//This going to contain our used trends so we don't post the same thing
var usedTrends = "";
var usedTweetIDs = "";
// ---------------------------------------------------------------------------------------
//								Initiliazer Functions & Calls
// ---------------------------------------------------------------------------------------
// All of these functions are called to set up variables before we tweet

// This creates a random integer from [0,max)
// In the context of our usage, this integer is a random index
function seed(max) {
	var num = Math.floor(Math.random()*Math.floor(max));
	return num;
}

//This is one of Twitter's base functions that grabs tweets, trends, etc
//In this case we are grabbing the top trending topics globally
//Twitter's documentation is kind of spotty so I will explain .get() here
//get takes in three parameters: 
//The first parameter is a discting id that tells what type of get we are calling
//The second parameter is based on the first parameter, but it is always a list
//	  of paramters that tells twitter what type of objects to return
//The third parameter is a callback function
//Call back functions are a topic that can take up a whole page of explanation
//	  but to keep it brief: Whenever you call a function that makes a request
//    to a server, node makes that function run independent of your other code.
//    Call back functions serve to tell the program what to do once the request
//    is completed
T.get('trends/place', {id: 1}, function(error, data){
	if (error) {
		console.log(error + "\n Getting trends");
	};
	twitTrends = data[0].trends;
	trendsSize = twitTrends.length;
});

// ---------------------------------------------------------------------------------------
//								 	Social Media Functions
// ---------------------------------------------------------------------------------------
// These are where we will write most of the body of our code
// These are the functions that will dictate how our bot interacts
// With the general populice of twitter
// Before we get into the thick of it though, here's a short primer about twitter
// objects and relevant methods:
//
// 			All of twtters objects are returned as JSON objects. JSON objects are
//			data structures that contain named fields which are arrays of objects.
//			These objects can be anything even other named fields, for example in
//			our last T.get function we asked for all the trends and got them in the
//			form of a JSON object. The JSON object was an array so we had to index in
//			the array to pull out the trends object. Within the trend object there's
//			a field named trend that contains the list of subjects we want, so we say
//			twitTrends = data[0].trends in order to get the list of subjects we want.
//
//			The core of any bot is the ability to post or retweet we do this with the
//			appropiately named post statement. post() takes in three arguments just like
//          the get() method: A signifier, a list of parameters, and a callback function.
//			If you are retweeting the signifier will include the ID of the tweet you want
//          to retweet ('status/retweet' + retweet_ID). The retweet signifier does not
//          require any parameters and as such you can return an empty list. The regular
//			status post ('status/post') requires atleast parameter {status: "Text here"}
//
//			If you want to like or follow a user this also covered by with the post() 
//			method. To like you use the 'favorites/create' signifier with the post id
//			as the field in parameter list. You can follow someone with the 'friendship/create'
//			and either the user_id or screen_name field in the parameter list

// This generates a tweet with a random topic that is trending globally  
function postLatestTrend() {
	//Whenever we us an object from a returned JSON file. We check to see if it undefined
	//before we try to use it. This will prevent our bot from crashing
	console.log("Running postLatestTrend");
	if(twitTrends != undefined) {
		var index = seed(trendsSize);
		if (twitTrends[index] != undefined){
			var trend = twitTrends[index];
			if (trend != undefined && usedTrends.indexOf(trend.name) == -1){
				var body = " is trending today. All you curious kitties should check it out \n";
				T.post('statuses/update',{status: trend.name + body + trend.url});
	  			usedTrends += trend.name;
	  			usedTrends += " ";
	  			console.log("Trend Posted");
			}
		} else {
			console.log("Trends at index: DNE");
		}
	} else {
		console.log("twitTrends: DNE");
	}
}
// This grabs a tweet from popular museums and tweets it.
function retweetMuseumPosts() {
	console.log("Running retweetMuseumPosts");
	var index = seed(museumSize);
	var params = {q:musuemsNames[index] + " filter:media"};
	T.get('search/tweets', params, function (error, data) {
		if (!error && data != undefined) {
			var tweets = data.statuses;
			var tweetsSize = tweets.length;
			var tIndex = seed(tweetsSize);
			if(tweets[tIndex] != undefined
			   && usedTweetIDs.indexOf(tweets[tIndex].id_str) == -1 ) {
				var retweetID = tweets[tIndex].id_str;
				T.post('favorites/create',{id:retweetID});
				T.post('statuses/retweet/' + retweetID, {}, function (error, data) {
					if(error) {
						console.log("Error in retweet");
					}
					usedTweetIDs += retweetID;
					console.log("Museum Retweeted");
				});
			}
		}
	});
}

function drawArtToCanvas(tweet, searchTag) {
	console.log("Beginning drawArtToCanvas");
	var mediaObj = tweet.entities.media[0];
	var userName = tweet.user.name;
	var userTag = tweet.user.screen_name;
	var imgURL = mediaObj.media_url;
	Jimp.read({url: imgURL}).then((image, err) => {
		if (err) {
			console.log("Error: "+ err);
		} else{
			image.sepia();
			var fileName = "sepiaPic.png";
			//This creates a sepia photo, but does so asynchronously, therefore we use
			//a callback function that contains the rest of our code to ensure everything
			// runs in order.
			image.write(fileName, () => {
				//This creates/links to the files we need
				var currentDirectory = process.cwd();
				var image_path = currentDirectory + "\\" + fileName;
				var b64content = fs.readFileSync(image_path, {encoding: 'base64'});
				T.post('media/upload', {media_data: b64content}, function (err, data, response) {
					var mediaIdStr = data.media_id_string;
					var pIndex = seed(curatePSize);
					var body = curatePhrase_Pre[pIndex];
					var params = {status: body + userName + " @" + userTag +" " + searchTag, media_ids: [mediaIdStr]};
					T.post('statuses/update', params, function (err, tweet, response){
						console.log(tweet.text);
					});
				});
			});
		}
	});

}
// This how we take art from various hashtags and then redraw them with a sepia 
// filter (if canvas decides to work...);
function searchForArt() {
	var cIndex = seed(curateSize);
	var searchParam = curatingSearches[cIndex];
	var searchTag = searchHashtags_Two[cIndex];
	// These variables will be used to loop through our list of tweets to find a
	// valid tweet that contains a media object of type photo. Once we find that
	// we call drawArtToCanvas which attempts to draw the photo and reupload it
	var maxIndex = searchParam.count;
	var tweetIndex = 0;
	var success = false;
	T.get('search/tweets', searchParam, function (error, data) {
		while (!success && tweetIndex < maxIndex) {
			var tweet = data.statuses[tweetIndex];
			if (tweet != undefined) {
				if (tweet.entities.media != undefined 
					&& tweet.entities.media[0].type == "photo") {
					var retweetID = tweet.user.id;
					T.post('favorites/create',{id:retweetID});
					//This line makes it to where we don't pull tweets from
					//before this tweet anymore
					curatingSearches[cIndex].since_id = retweetID;
					drawArtToCanvas(tweet, searchTag);
					success = true;
				} else {
					console.log("Iterating in searchForArt");
					tweetIndex++;
				}
			} else {
				console.log("Iterating in searchForArt");
				tweetIndex++;
			}
		}
	});
}

// This function posts a catchphrase every so often
function postSearchPhrase() {
	console.log("Running postSearchPhrase");
	var sIndex = seed(searchSize);
	var phrase = searchPhrases[sIndex];
	var hIndex = seed(searchH1Size);
	var fIndex = seed(searchH3Size);
	console.log("fIndex = " + fIndex)
	var hashTag = searchHashtags_One[hIndex];
	var flavorTag = searchHashtags_Three[fIndex];
	console.log("fTag = " + flavorTag)
	T.post('statuses/update',{status: phrase + " " + hashTag + " " + flavorTag})
		.catch((err)=>{
							console.log("Saved bot from stopping at thankFollowers")
						});
}

// This function thanks a random follower for keeping up with the cat
function thankFollowers() {
	console.log("Running thankFollowers");
	T.get('followers/list', {screen_name:'CraftGoodVibes', cursor: -1, count: 200},
		function (error, data) {
			if (!error & data != undefined) {
				followers = data.users;
				fIndex = seed(followers.length);
				highlight = followers[fIndex];
				if (highlight != undefined) {
					var userName = highlight.name;
					var userScreenName = highlight.screen_name;
					var thanks = "Thank to all the curious kitties who follow me. "
					var body = "I want to give a special shoutout to: "
					var body2 = "Thanks for keeping up with the archive "
					var signOff = " #MyFirstTweetArchive"
					var fullText = thanks + body + "@" + userScreenName;
					if (fullText.length < (280 - signOff.length)) {
						fullText += signOff;
					}
					console.log("Follower Thanked");
					T.post('statuses/update',{status: fullText})
						.catch((err)=>{
							console.log("Saved bot from stopping at thankFollowers")
						})
							
				}
			}
		});
}

// ---------------------------------------------------------------------------------------
//								 	Actual Execution Code
// ---------------------------------------------------------------------------------------
//
// This is the easiest part of the bot. All the code below will run automatically after
// node processes all of the functions and data. We're going to use setInterval to create
// a loop that makes the bot run these functions after a distinct amount of time. setInterval()
// takes in a function name and a integer representing milliseconds as parameters. As such we
// are going to declare global variables for seconds, minutes, and hours, so we can set the time
// code accurately.

var seconds = 1000;
var minutes = 60 * seconds;
var hours = 60 * minutes;
var days = 24 * hours;
setInterval(postLatestTrend, hours * 3);
setInterval(postSearchPhrase, hours * 2);
setInterval(retweetMuseumPosts, minutes * 45);
setInterval(thankFollowers, hours * 6);
setInterval(searchForArt, minutes * 35);
console.log("CuratorCat Logging on");