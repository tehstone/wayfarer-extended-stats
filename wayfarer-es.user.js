// ==UserScript==
// @name         Wayfarer Extended Stats
// @version      0.1.0
// @description  Add extended Wayfarer Profile stats
// @namespace    https://github.com/tehstone/wayfarer-extended-stats
// @downloadURL  https://github.com/tehstone/wayfarer-extended-stats/raw/main/wayfarer-es.user.js
// @homepageURL  https://github.com/tehstone/wayfarer-extended-stats
// @match        https://wayfarer.nianticlabs.com/*
// ==/UserScript==

/* eslint-env es6 */
/* eslint no-var: "error" */

function init() {
	let tryNumber = 10;
	let stats;

	let selection = localStorage['wfcc_count_type_dropdown'];
	  if (!selection) {
	    selection = 'upgradecount';
	    localStorage['wfcc_count_type_dropdown'] = selection;
	  }

	/**
	 * Overwrite the open method of the XMLHttpRequest.prototype to intercept the server calls
	 */
	(function (open) {
		XMLHttpRequest.prototype.open = function (method, url) {
			if (url == '/api/v1/vault/profile') {
				if (method == 'GET') {
					this.addEventListener('load', parseStats, false);
				}
			}
			open.apply(this, arguments);
		};
	})(XMLHttpRequest.prototype.open);

	addCss();

	function parseStats(e) {
		try {
			const response = this.response;
			const json = JSON.parse(response);
			if (!json) {
				alert('Failed to parse response from Wayfarer');
				return;
			}
			// ignore if it's related to captchas
			if (json.captcha)
				return;

			stats = json.result;
			if (!stats) {
				alert('Wayfarer\'s response didn\'t include a candidate.');
				return;
			}
			addSettings();
			addCopyLink();

		} catch (e)	{
			console.log(e); // eslint-disable-line no-console
		}

	}

	function addSettings() {
		const ref = document.querySelector('wf-logo');

		if (!ref) {
			if (tryNumber === 0) {
				document.querySelector('body')
					.insertAdjacentHTML('afterBegin', '<div class="alert alert-danger"><strong><span class="glyphicon glyphicon-remove"></span> Wayfarer Clippy Copy initialization failed, refresh page</strong></div>');
				return;
			}
			setTimeout(addSettings, 1000);
			tryNumber--;
			return;
		}

		const testelem = document.getElementById("wayfarercccounttype");
	    if (testelem !== null) {
	      return;
	    }

		const div = document.createElement('div');
		let select = document.createElement('select');
	    select.title = "Select count type";
	    const reviewTypes = [
	      {name: "badgestat", title: "Badge Stat"},
	      {name: "upgradecount", title: "Upgrade Count"}
	    ];
	    select.innerHTML = reviewTypes.map(item => `<option value="${item.name}" ${item.name == selection ? 'selected' : ''}>${item.title}</option>`).join('');
	    select.addEventListener('change', function () {
	      selection = select.value;
	      localStorage['wfcc_count_type_dropdown'] = selection;
	      updateAgreementDisplay();
	    });
	    select.id = 'wayfarercccounttype';
	    select.classList.add('wayfarercc_select');

	    let input = document.createElement('input');
	    input.setAttribute("type", "number");
	    input.setAttribute("size", '2');
	    //input.size = 3;
	    const userId = getUserId();
	    let badgeCount = localStorage["wfcc_badge_count_" + userId];
	    if (badgeCount === undefined || badgeCount === null || badgeCount === "" || badgeCount === "false"){
		    badgeCount = 0;
		}
		input.value = badgeCount;
		input.addEventListener('change', function () {
	        const userId = getUserId();
	        badgeCount = this.value;
	    	localStorage["wfcc_badge_count_" + userId] = badgeCount;
	    	updateAgreementDisplay();
	    });
	    input.classList.add('wayfarercc_input');

	    div.appendChild(select);
	    div.appendChild(document.createElement('br'))
	    div.appendChild(input);
	    const container = ref.parentNode.parentNode;
    	container.appendChild(div);
    	div.classList.add('wayfarerrh__visible');
	}

	function updateAgreementDisplay() {
		let countDiv = document.getElementById("totalcountnumber");
		if (countDiv !== null) {
			const {finished, total, progress} = stats;
			const newCount = getTotalAgreementCount(total, progress);
			const percent = ((newCount / finished)*100).toFixed(1);
    		countDiv.innerHTML = newCount + " (" + percent + "%)";
		}
	}

	function addCopyLink() {
		const ref = document.querySelector('app-rating-bar');
		var els = document.getElementsByClassName("profile-stats__section-title")

		if (!ref || els.length === 0) {
			if (tryNumber === 0) {
				document.querySelector('body')
					.insertAdjacentHTML('afterBegin', '<div class="alert alert-danger"><strong><span class="glyphicon glyphicon-remove"></span> Wayfarer Clippy Copy initialization failed, refresh page</strong></div>');
				return;
			}
			setTimeout(addCopyLink, 1000);
			tryNumber--;
			return;
		}


		const div = document.createElement('div');
	    let exportButton = document.createElement('button');
	    exportButton.innerHTML = "Copy Stats";
	    exportButton.onclick = function() {
	      exportStats();
	    }
	    exportButton.classList.add('wayfarercc__button');
	    exportButton.id = "wayfarerccexport";

	    div.appendChild(document.createElement('br'));
		div.appendChild(exportButton);

		const container = ref.parentNode;
		container.appendChild(div);

		CCButton = div;
    	CCButton.classList.add('wayfarercc__visible');

    	const parentRef = getStatsParent();
    	if (parentRef !== null) {
    		const totalparent = document.createElement('div');
    		let totaltext = document.createElement('div');
    		totaltext.innerHTML = "Processed & Agreement";
    		totaltext.classList.add("wayfarercc_text");

    		let totalcount = document.createElement('div');
    		totalcount.id = "totalcountnumber"
    		const {accepted, rejected, duplicated, finished, available, progress, total} = stats;
    		allAgreements = getTotalAgreementCount(total, available, progress);
    		const percent = ((allAgreements / finished)*100).toFixed(1);
    		totalcount.innerHTML = allAgreements + " (" + percent + "%)";
    		totalcount.classList.add("wayfarercc_count");

    		totalparent.appendChild(totaltext);
    		totalparent.appendChild(totalcount);
    		insertAfter(totalparent, parentRef);
    		totalparent.classList.add("profile-stats__stat");
    		totalparent.classList.add("wayfarercc_parent");
    	}
	}

	function getTotalAgreementCount(total, available, progress) {
		const countType = localStorage['wfcc_count_type_dropdown'];
		if (countType === "badgestat") {
			const userId = getUserId();
		    let badgeCount = localStorage["wfcc_badge_count_" + userId];
		    if (badgeCount === undefined || badgeCount === null || badgeCount === "" || badgeCount === "false"){
			    badgeCount = 0;
			}
			return badgeCount;
		} else {
			return (total + available) * 100 + progress;
		}
	}

	function insertAfter(newNode, referenceNode) {
	    referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
	}

	function getStatsParent() {
		var els = document.getElementsByClassName("profile-stats__section-title");
		for (var i = 0; i < els.length; i++) {
       		const element = els[i];
       		if (element.innerHTML === "Agreements") {
       			return element;
       		}
       	}
       	console.log("element not found");
       	return null;
	}

	function exportStats() {
	  const {performance, finished, accepted, rejected, duplicated, available, progress, total} = stats;
	  let other = 0;
	  let total_agreements = 0;
	  const base_agreements = accepted + rejected + duplicated;
	  
	  let count_type = localStorage['wfcc_count_type_dropdown'];
	  if (count_type === "badgestat") {
	  	count_type = "facts";
	  	total_agreements = base_agreements;
	  } else {
	  	count_type = "aprox";
	  	total_agreements = (total * 100) + progress;
	  	other = total_agreements - base_agreements;
	  }

	  const userId = getUserId();
      let badgeCount = localStorage["wfcc_badge_count_" + userId];
      if (badgeCount === undefined || badgeCount === null || badgeCount === "" || badgeCount === "false"){
	    badgeCount = 0;
	  }

	  const exportData = {
	  	"current_rating": performance,
		"total_nominations": finished,
		"total_agreements": total_agreements,
		"accepted": accepted,
		"rejected": rejected,
		"duplicates": duplicated,
		"other": other,
		"upgrades_available": available,
		"current_progress": progress,
		"upgrades_redeemed": total - available,
		"extended_type": count_type,
		"badge_count": badgeCount
	  }

	  navigator.clipboard.writeText(JSON.stringify(exportData));
	}

	function getUserId() {
	    var els = document.getElementsByTagName("image");
	    for (var i = 0; i < els.length; i++) {
	       const element = els[i];
	       const attribute = element.getAttribute("href");
	       let fields = attribute.split('/');
	       let userId = fields[fields.length-1];
	       fields = userId.split('=');
	       userId = fields[0];
	       return userId;
	    }
	    return "temporary_default_userid";
	  }

	function addCss() {
		const css = `

			.wayfarercc {
		        color: #333;
		        margin-left: 2em;
		        padding-top: 0.3em;
		        text-align: center;
		        display: none;
		      }

		    .wayfarercc_select {
		    	margin:  2px 12px;
		    	padding: 2px 12px;
		    	background-color: #e5e5e5;
		    }

		    .wayfarercc_input {
		    	margin:  2px 12px;
		    	padding: 2px 12px;
		    	width: 90px;
		    	background-color: #e5e5e5;
		    }

		      .wayfarercc_parent {
		      	display: flex;
		      	margin: 16px 0px 0px;
		      }

		      .wayfarercc_text {
		      	font-size: 18px;
		      }

		      .wayfarercc_count {
		      	font-size: 18px;
		      	margin: 0px 0px 0px 80px;
		      }

		      .wayfarercc__visible {
		        display: block;
		      }

		      .dark .wayfarerrh {
		        color: #ddd;
		      }

		      .wayfarercc__button {
		        background-color: #e5e5e5;
		        border: none;
		        color: #ff4713;
		        padding: 4px 10px;
		        margin: 1px;
		        text-align: center;
		        text-decoration: none;
		        display: inline-block;
		        font-size: 16px;
		      }

		      .wayfarercc__hiddendl {
		        display: none;
		      }
			`;
		const style = document.createElement('style');
		style.type = 'text/css';
		style.innerHTML = css;
		document.querySelector('head').appendChild(style);
	}
}

init();

