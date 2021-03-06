// Copyright (c) 2021
// Free to use. Free to alter. No rights to distribute.
// Mark Macheta
// bawat@hotmail.co.uk 


var listOfTimeSpentOnEachPage = {
	list: [],
	containsURL: function(url){
		for (var i = 0; i < listOfTimeSpentOnEachPage.list.length; i++) {
			if (listOfTimeSpentOnEachPage.list[i].url === url) {
				return true;
			}
		}
		return false;
	},
	increaseTime: function(url, timeTaken){
		if(!listOfTimeSpentOnEachPage.containsURL(url)){
			listOfTimeSpentOnEachPage.list.push({url: url, timeOnPage: 0})
		}
		for (var i = 0; i < listOfTimeSpentOnEachPage.list.length; i++) {
			if (listOfTimeSpentOnEachPage.list[i].url === url) {
				listOfTimeSpentOnEachPage.list[i].timeOnPage += timeTaken;
				return;
			}
		}
	}
};

var currentlyActivePage = {
	url: null,
	tabID: null,
	openedTime: new Date(),
	process: function(activeInfo){		
		processInactivity("active", function(){			
			currentlyActivePage.setClosed();
			currentlyActivePage.setOpen(activeInfo);
		});
	},
	setOpen: function(activeInfo){
		currentlyActivePage.tabID = activeInfo.tabId;
		chrome.tabs.get(activeInfo.tabId, function(tab){
			console.log("Just opened: " + tab.url);
			currentlyActivePage.url = urlToDomain(tab.url);
		});
		openedTime = new Date();
	},
	setClosed: function(){
		if(currentlyActivePage.url == null) {
			//Initialise from local storage
			chrome.storage.local.get(['listOfTimeSpentOnEachPage'], function(result) {
				listOfTimeSpentOnEachPage.list = result.listOfTimeSpentOnEachPage.list;
			});
			return;
		}
		
		var closedTime = new Date();
		var timeSpentOnPage = closedTime-openedTime-timeInactiveOnTab-cumulativeScreenShutTime;
		timeInactiveOnTab = 0;
		cumulativeScreenShutTime = 0;
		listOfTimeSpentOnEachPage.increaseTime(currentlyActivePage.url, timeSpentOnPage);
		
		console.log("Exited page " + currentlyActivePage.url + " spent " + formatTimeDiff(timeSpentOnPage) + " on page.");
		
		chrome.storage.local.set({listOfTimeSpentOnEachPage: listOfTimeSpentOnEachPage}, function() {});
	}
};

chrome.tabs.onActivated.addListener(function(activeInfo) {
	displayStatsIfNewDay();
	currentlyActivePage.process(activeInfo);
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab){
	if(currentlyActivePage.tabID == tabId && 'url' in changeInfo){
		currentlyActivePage.process({tabId: tabId});
	}
});

//Detect sleep/laptop screen close
var lastTimeIterated = new Date();
var screenCloseCheckInterval = 500;
var cumulativeScreenShutTime = 0;
setInterval(function(){
	var timeScreenShutFor = new Date() - lastTimeIterated - screenCloseCheckInterval;
	if(timeScreenShutFor > 10 && newState == "active"){
		console.log("Screen was shut for " + formatTimeDiff(timeScreenShutFor));
		cumulativeScreenShutTime += timeScreenShutFor;
	}
	lastTimeIterated = new Date();
}, screenCloseCheckInterval);

var prevState = "active";
var newState = "active";
var lastTimeWasActive;
var timeInactiveOnTab = 0;
chrome.idle.onStateChanged.addListener(processInactivity);
function processInactivity(newStateEnum, callback){
	prevState = newState;
	newState = newStateEnum;
	
	chrome.storage.local.get(['badList'], function(result){
		var badList = [];
		if('badList' in result && Array.isArray(badList)){
			badList = result.badList;
		}

		if(badList.indexOf(currentlyActivePage.url) != -1){
			console.log("Inactivity denied on bad pages.");
			runIfDefined(callback);
			return;
		}
		
		if(prevState == "active" && newState != "active"){
			lastTimeWasActive = new Date().getTime();
			console.log("Gone inactive.");
		}
		
		if(prevState != "active" && newState == "active"){
			timeInactiveOnTab += new Date().getTime() - lastTimeWasActive;
			console.log("Back from inactivity! Was away for " + formatTimeDiff(timeInactiveOnTab));
		}
		runIfDefined(callback);
	});
}
function runIfDefined(callback){
	if(callback && typeof callback === "function"){
		callback();
	}
}
function displayStatsIfNewDay(){
	chrome.storage.local.get(['lastTimeUpdated'], function(result){
		if('lastTimeUpdated' in result){
			var lastTimeUpdated = result.lastTimeUpdated;
			if(new Date(lastTimeUpdated).getDate() != new Date().getDate()){
				displayStats();
			}
		}
		chrome.storage.local.set({lastTimeUpdated: new Date().getTime()}, function() {});
	});
}
function displayStats(){
	chrome.storage.local.get(['listOfTimeSpentOnEachPage', 'badList'], function(result) {
		var listOfTimeSpentOnEachPage = result.listOfTimeSpentOnEachPage.list;
		var badList = result.badList;
		var worstOffenders = [];
		var totalTimeUsed = 0;
		var totalWastedTime = 0;
		for(var i = 0; i < listOfTimeSpentOnEachPage.length; i++){
			var url = listOfTimeSpentOnEachPage[i].url;
			var timeOnPage = listOfTimeSpentOnEachPage[i].timeOnPage;
			
			totalTimeUsed += timeOnPage;
			if(badList.indexOf(url) != -1){
				worstOffenders.push({domain: url, timeOnPage: timeOnPage});
				totalWastedTime += timeOnPage;
			}
		}
		
		listOfTimeSpentOnEachPage.sort((a, b) => b.timeOnPage - a.timeOnPage);
		worstOffenders.sort((a, b) => b.timeOnPage - a.timeOnPage);
		
		var msg = "Total computer time: " + formatTimeDiff(totalTimeUsed) + "\n";
		msg += "Total wasted time: " + formatTimeDiff(totalWastedTime) + " (" + (100* totalWastedTime/totalTimeUsed).toFixed(2) + "%)\n";
		
		for(var i = 0; i < worstOffenders.length; i++){
			if(worstOffenders[i].timeOnPage < 60 * 1000) continue;
			var percentageTimeWasted = 100* worstOffenders[i].timeOnPage/totalTimeUsed;
			msg += "• " + formatTimeDiff(worstOffenders[i].timeOnPage) + " on " + worstOffenders[i].domain + " (" + percentageTimeWasted.toFixed(2) + "%)\n";
		}
		alert(msg);
		if (confirm('Keep fighting the good fight!\nWould you like to start today with fresh stats?')) {
		  clearStats();
		}
	});
}
function clearStats(){
	listOfTimeSpentOnEachPage.list = [];
	chrome.storage.local.set({listOfTimeSpentOnEachPage: {list: []}}, function() {});
}
function urlToDomain(url) {
	var a = document.createElement('a');
	a.href = url;
	return a.hostname;
}
function formatTimeDiff(timeDiff) {

    var seconds = Math.floor(timeDiff / 1000);

    var interval = Math.floor(seconds / 31536000);

    if (interval > 1) {
        return interval + " years";
    }
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) {
        return interval + " months";
    }
    interval = Math.floor(seconds / 86400);
    if (interval > 1) {
        return interval + " days";
    }
    interval = Math.floor(seconds / 3600);
    if (interval > 1) {
        return interval + " hours";
    }
    interval = Math.floor(seconds / 60);
    if (interval > 1) {
        return interval + " minutes";
    }
    return Math.floor(seconds) + " seconds";
}