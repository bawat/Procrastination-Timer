// Copyright (c) 2021
// Free to use. Free to alter. No rights to distribute.
// Mark Macheta
// bawat@hotmail.co.uk 

'use strict';

document.addEventListener('DOMContentLoaded', function () {
	initPage();
});
function initPage(){
	chrome.storage.local.get(['listOfTimeSpentOnEachPage', 'badList'], function(result) {
		var listOfTimeSpentOnEachPage = result.listOfTimeSpentOnEachPage.list;
		var badList = result.badList;
		var totalTimeUsed = 0;
		var totalWastedTime = 0;
		
		listOfTimeSpentOnEachPage.sort((a, b) => b.timeOnPage - a.timeOnPage);
	
		for(var i = 0; i < listOfTimeSpentOnEachPage.length; i++){
			var element = document.createElement("div");
			var url = listOfTimeSpentOnEachPage[i].url;
			var timeOnPage = listOfTimeSpentOnEachPage[i].timeOnPage;
			element.innerHTML = formatTimeDiff(timeOnPage) + " on " + url;
			element.onclick = toggleInBadList;
			element.dataset.representedDomain = url;
			
			totalTimeUsed += timeOnPage;
			if(badList.indexOf(url) != -1){
				element.classList.add("isBad");
				totalWastedTime += timeOnPage;
			}
			
			document.body.appendChild(element);
		}
		
		var element = document.createElement("span");
		var percentageTimeWasted = totalWastedTime/totalTimeUsed;
		element.innerHTML = (percentageTimeWasted * 100).toFixed(2) + "% Wasted today";
		element.style = "background-color: rgb(" + percentageTimeWasted * 255 + "," + (1-percentageTimeWasted) * 255 + "," + (1-percentageTimeWasted) * 100 + ");";
		
		document.body.prepend(element);
	});
}
function toggleInBadList(){
	var domain = this.dataset.representedDomain;
	if(this.classList.contains("isBad")){
		this.classList.remove("isBad");
		altarBadList(function(badList){
			var index = badList.indexOf(domain);
			if (index !== -1) {
			  badList.splice(index, 1);
			}
		});
	}else{
		this.classList.add("isBad");
		altarBadList(function(badList){
			badList.push(domain);
		});
	}
}
function altarBadList(funct){
	chrome.storage.local.get(['badList'], function(result){
		var badList = [];
		if('badList' in result && Array.isArray(badList)){
			badList = result.badList;
		}
		
		funct(badList);
		
		chrome.storage.local.set({badList: badList}, function(result) {
			//Reload the page
			document.body.innerHTML = "";
			initPage();
		});
	});
}
function debugBadList(){
	chrome.storage.local.get(['badList'], function(result){alert(JSON.stringify(result))});
}
function clearBadList(){
	chrome.storage.local.set({badList: []}, function(result) {});
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