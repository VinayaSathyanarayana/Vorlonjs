/// <reference path="api/vorlon.core.d.ts" />
/// <reference path="api/vorlon.dashboardPlugin.d.ts" />
/// <reference path="api/mapping-system.d.ts" />
/// <reference path="api/shared-definitions.d.ts" />
var $ : any;

module VORLON {
	
    export class DOMTimelineDashboard extends DashboardPlugin {

        //Do any setup you need, call super to configure
        //the plugin with html and css for the dashboard
        constructor() {
            //     name   ,  html for dash   css for dash
            super("domtimeline", "control.html", "control.css");
            (<any>this)._ready = true;
            this._messageHandlers = {};
            this._messageId = 0;
            console.log('Started');
        }

        //Return unique id for your plugin
        public getID(): string {
            return "DOMTIMELINE";
        }

        // This code will run on the dashboard //////////////////////

        // Start dashboard code
        // uses _insertHtmlContentAsync to insert the control.html content
        // into the dashboard
        private _inputField: HTMLInputElement
        //private _outputDiv: HTMLElement
        //private _toastDiv: HTMLElement
        private _messageId: number;
        private _messageHandlers: {[s:string]:(receivedObject:any)=>void};
        
        public startDashboardSide(div: HTMLDivElement = null): void {
            this._insertHtmlContentAsync(div, (filledDiv) => {
                this._inputField = <HTMLInputElement>filledDiv.querySelector('#echoInput');
                filledDiv.querySelector("#open-popup-button").addEventListener('click', () => {

                    var popup = window.open("about:blank", "popup", "width=800,height=600,menubar=no,toolbar=no,location=no,resizable=yes,scrollbars=yes,status=no");
                    var pDoc = popup.document;
                    var doctypeText = getDoctypeText();
                    pDoc.open();
                    pDoc.write(doctypeText+"<html></html>");
                    pDoc.close();
                    var oRE : HTMLHtmlElement = <any>pDoc.documentElement;
                    var nRE : HTMLHtmlElement = <any>getNewRootElement();
                    var nHE : HTMLHeadElement = <any>nRE.querySelector("head") || createHeadFor(nRE);
                    var nBE : HTMLBaseElement = <any>nHE.querySelector("base") || createBaseFor(nHE);
                    nBE.href = clientUrl;
                    disableScripts(nRE);
                    popup.document.replaceChild(nRE,oRE);
                    enableScripts(nRE);
                    __startAnimation();

                    function getDoctypeText() {
                        var docStart = domData.p2oMap.get("0:0");
                        return ("tagName" in docStart) ? '' : domData.data[0].outerHTML;
                    }
                    function getNewRootElement() {
                        var docStart = domData.p2oMap.get("0:0");
                        if(!("tagName" in docStart)) {
                            docStart = domData.p2oMap.get("1:0");
                        }
                        return docStart;
                    }
                    function createHeadFor(htmlElement) {
                        // normal position of the head, 
                        // but we are screwed by now I think because doc will likely insert another one soon
                        var headElement = pDoc.createElement('head');
                        htmlElement.insertBefore(headElement, htmlElement.firstChild); 
                        return headElement;
                    }
                    function createBaseFor(headElement) {
                        // position least likely to hurt anything, 
                        // we should be okay
                        var baseElement = pDoc.createElement('base');
                        headElement.insertBefore(baseElement, headElement.lastChild); 
                        return baseElement;
                    }
                    function disableScripts(root) {
                        var scripts = root.querySelectorAll('script');
                        for(var s = scripts.length; s--;) {
                            var script = scripts[s];
                            script.type = "!" + script.type;
                        }
                    }
                    function enableScripts(root) {
                        var scripts = root.querySelectorAll('script[type^="!"]');
                        for(var s = scripts.length; s--;) {
                            var script = scripts[s];
                            script.type = "!" + script.type;
                        }
                    }
                    function __startAnimation() {

                        var popupLastPastEventsCount = 0;
                        setInterval(function() {
                            if(popupLastPastEventsCount != lastPastEventsCount) {
                                // we should sync our view with the real view now
                                if(popupLastPastEventsCount < lastPastEventsCount) {
                                    // we need to redo some changes
                                    for(var i = popupLastPastEventsCount; i != lastPastEventsCount; i++) {
                                        redoMutationRecord(convertToMutationRecord(alreadyKnownEvents[i].rawData));
                                    }
                                } else {
                                    // we need to undo some changes
                                    for(var i = popupLastPastEventsCount; i != lastPastEventsCount; i--) {
                                        undoMutationRecord(convertToMutationRecord(alreadyKnownEvents[i-1].rawData));
                                    }
                                }
                                // save the fact we synced
                                popupLastPastEventsCount = lastPastEventsCount;
                            }
                        }, 33);

                        function convertToMutationRecord(d) {
                            var e : any = {};
                            for(var key in d) { e[key] = d[key]; }
                            if(e.target) e.target = domData.getObjectFor(e.target);
                            if(e.nextSibling) e.nextSibling = domData.getObjectFor(e.nextSibling);
                            if(e.addedNodes) e.addedNodes = domData.getObjectListFor(e.addedNodes);
                            if(e.removedNodes) e.removedNodes = domData.getObjectListFor(e.removedNodes);
                            return e; 
                        }

                        // 
                        // execute the action which cancels a mutation record
                        // 
                        function undoMutationRecord(change) {
                            switch(change.type) {
                                
                                //
                                case "attributes":
                                    change.target.setAttribute(change.attributeName, change.oldValue);
                                    if(change.attributeName=='value') change.target.value = change.oldValue||'';
                                return;
                                
                                //
                                case "characterData":
                                    change.target.nodeValue = change.oldValue;
                                return;
                                
                                //
                                case "childList":
                                    if(change.addedNodes) {
                                        for(var i = change.addedNodes.length; i--;) {
                                            change.addedNodes[i].remove();
                                        }
                                    } 
                                    if(change.removedNodes) {
                                        var lastNode = change.nextSibling;
                                        for(var i = change.removedNodes.length; i--;) {
                                            change.target.insertBefore(change.removedNodes[i], lastNode);
                                            lastNode = change.removedNodes[i];
                                        }
                                    }
                                return;
                                
                            }
                        }
                        
                        // 
                        // execute the action which replicates a mutation record
                        // 
                        function redoMutationRecord(change) {
                            switch(change.type) {
                                
                                //
                                case "attributes":
                                    change.target.setAttribute(change.attributeName, change.newValue);
                                    if(change.attributeName=='value') change.target.value = change.newValue||'';
                                return;
                                
                                //
                                case "characterData":
                                    change.target.nodeValue = change.newValue;
                                return;
                                
                                //
                                case "childList":
                                    if(change.addedNodes) {
                                        var lastNode = change.nextSibling;
                                        for(var i = change.addedNodes.length; i--;) {
                                            change.target.insertBefore(change.addedNodes[i], lastNode);
                                            lastNode = change.addedNodes[i];
                                        }
                                    } 
                                    if(change.removedNodes) {
                                        for(var i = change.removedNodes.length; i--;) {
                                            change.removedNodes[i].remove();
                                        }
                                    }
                                return;
                                
                            }
                        }
                    }
                });
                //this._outputDiv = <HTMLElement>filledDiv.querySelector('#output');
                //this._toastDiv = <HTMLElement>filledDiv.querySelector('#toast');
                
                var dashboard = initDashboard();

				// Handle toolbar buttons
				var me = this;
				var clientCommands = filledDiv.querySelectorAll("[data-client-command]");
				for(var i = clientCommands.length; i--;) { var clientCommand = <HTMLElement>clientCommands[i];
					clientCommand.onclick = function(event) {
						me.sendMessageToClient(this.getAttribute("data-client-command"), (e)=>me.logMessage(e));
					};
				}

                // Send message to client when user types and hits return
                this._inputField.addEventListener("keydown", (evt) => {
                    if (evt.keyCode === 13) {
                        this.sendMessageToClient(this._inputField.value, (e)=>me.logMessage(e));
                        this._inputField.value = "";
                    }
                });
                
                // Refresh the output from time to time
                var clientUrl = "about:blank";
                var domData = new MappingSystem.NodeMappingSystem();
                var alreadyKnownEvents = [], lastPastEventsCount = 0;
                var updateTimer = setInterval(function() {
                    me.sendMessageToClient(
                        "domHistory.generateDashboardData("+`{history:${alreadyKnownEvents.length},lostFuture:0,domData:${domData.data.length}}`+")", 
                        (e)=>{
                            
                            // refresh metadata
                            clientUrl = e.message.url;
                            document.getElementById("dom-recorder").setAttribute('is-recording-started', e.message.isRecordingNow || e.message.isRecordingEnded);
                            document.getElementById("dom-recorder").setAttribute('is-recording-ended', e.message.isRecordingEnded);

                            // nothing significant changed, don't update
                            if(e.message.history.length == 0 && e.message.pastEventsCount == lastPastEventsCount) {
                                return;
                            }
                            // merge histories
                            if(e.message.pastEventsCount + e.message.futureEventsCount != 0) {
                                alreadyKnownEvents = e.message.history = alreadyKnownEvents.concat(e.message.history);
                            } else {
                                alreadyKnownEvents = e.message.history;
                                lastPastEventsCount = e.message.pastEventsCount;
                            }
                            for(var i = alreadyKnownEvents.length; i--;) {
                                alreadyKnownEvents[i].isCancelled = i >= e.message.pastEventsCount;
                                lastPastEventsCount = e.message.pastEventsCount;
                            }
                            // merge domData
                            domData.importData(e.message.domData);
                            // refresh content
                            dashboard.setTimeline(alreadyKnownEvents);
                            //me._outputDiv.textContent=JSON.stringify(e.message,null,"    ");
                            
                        }
                    ); 
                }, 500);
            })
        }

        // When we get a message from the client, just show it        
        public logMessage(receivedObject: any) {
            var message = document.createElement('p');
            message.textContent = receivedObject.message;
            console.log(message);
            //this._toastDiv.appendChild(message);
        }
		
        // sends a message to the client, and enables you to provide a callback for the reply
		public sendMessageToClient(message: string, callback:(receivedObject:any)=>void = undefined) {
            var messageId = this._messageId++;
            if(callback) this._messageHandlers[messageId] = callback;
			this.sendToClient({message,messageId});
		}

        // execute the planned callback when we receive a message from the client
        public onRealtimeMessageReceivedFromClientSide(receivedObject: any): void {
            var callback = this._messageHandlers[receivedObject.messageId];
            if(callback) {
                this._messageHandlers[receivedObject.messageId] = undefined;
                callback(receivedObject);
            }
        }
    }

    //Register the plugin with vorlon core
    Core.RegisterDashboardPlugin(new DOMTimelineDashboard());
}


function initDashboard() {

    var SCALE = 0.5;
    var START_TIME = 0;
    var FRAMES_PER_SECOND = 5;
    var TIMELINE_SECONDS = 20;
    var timelineBaseHTML = document.getElementById('timeline').innerHTML;

    var setNumberChanges = function (timeline : DashboardDataForEntry[]) {
        document.querySelectorAll('.inline-changes-added span')[0].innerHTML = '' + countByType('added', timeline);
        document.querySelectorAll('.inline-changes-removed span')[0].innerHTML = '' + countByType('removed', timeline);
        document.querySelectorAll('.inline-changes-modified span')[0].innerHTML = '' + countByType('modified', timeline);
    }

    var setChanges = function (changes : DashboardDataForEntry[]) {
        var html = '';
        
        var times = {};
        var max = { time: 0, count: 0 };
        for (var i = 0, len = changes.length; i < len; i++) {
            var change = changes[i], changeTime = Math.floor(change.timestamp/1000 * FRAMES_PER_SECOND) / FRAMES_PER_SECOND;
            var details_table = '';
            for (var key in change.details) {
                var value = ''+change.details[key]; var value_lines = value.split('\n');
                var value_line = ((value_lines.length < 3) ? value : fixCode(value_lines[0] + ' [...]'));
                details_table += '<tr><td class="td-name">' + key + ':</td><td class="td-value" title="'+escapeHtml(value)+'">' + escapeHtml2(value_line) + '</td></tr>';
            }
            var details = '<li class="acc" style="display:none;"><table>' + details_table + '</table></li>';
            html += '<li data-id=" ' + i + ' " data-time=" ' + changeTime + ' " is-cancelled="'+change.isCancelled+'" class="show-change acc-tr accordion-changes-' + change.type + '">' + escapeHtml(change.description) + ' <span>' + changeTime + 's</span><i class="fa fa-undo"></i></li>' + details;
            if (typeof times[changeTime] === 'undefined') {
                times[changeTime] = { added: 0, removed: 0, modified: 0, count: 0 };
            }
            times[changeTime].count++;
            times[changeTime][change.type]++;
            if (max.count < times[changeTime].count) {
                max.count = times[changeTime].count;
                max.time = changeTime;
            }
        }
        document.querySelectorAll('.accordion-changes')[0].innerHTML = html;

        for (var i = 0; i < document.getElementsByClassName('acc-tr').length; i++) {
            document.getElementsByClassName('acc-tr')[i].addEventListener('click', function (e) {
                if ($(this).hasClass('hide-change')) {
                    e.preventDefault();
                    return;
                }

                if ($(this.nextElementSibling).css('display') == 'none') {
                    $(this.nextElementSibling).show();
                } else {
                    $(this.nextElementSibling).hide();
                }

                var className = 'rotate';

                if ($(this.nextElementSibling).css('display') == 'block') {
                    if (this.classList) {
                        this.classList.add(className);
                    } else {
                        this.className += ' ' + className;
                    }
                } else {
                    if (this.classList) {
                        this.classList.remove(className);
                    } else {
                        this.className = this.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
                    }
                }
            }, false);
        }

        html = "";
        for (var timeIndex in times) {
            var time = times[timeIndex];
            var minHeight = (time.added?3:0) + (time.added?3:0) + (time.added?3:0);
            var totalHeight = SCALE * 85 * Math.log(1 + time.count / 10) / Math.log(1 + max.count / 10);
            totalHeight = Math.max(totalHeight, minHeight);
            var distributableHeight = totalHeight - minHeight;
            var addedHeight = (time.added?3:0) + distributableHeight * time.added / time.count;
            var removedHeight = (time.removed?3:0) + distributableHeight * time.removed / time.count;
            var modifiedHeight = (time.modified?3:0) + distributableHeight * time.modified / time.count;
            var times_h = '';
            times_h += '<span data-hint="' + time.added + ' added" class="added_h hint--right hint--success" style="' + (((time.modified || time.removed) && time.added) ? 'border-bottom: 1px solid white;' : '') + 'height: ' + addedHeight + 'px;"></span>';
            times_h += '<span data-hint="' + time.modified + ' modified" ' + ((!time.modified) ? 'style="border:none !important;"' : '') + ' class="modified_h hint--right hint--info" style="' + ((time.removed && time.modified) ? 'border-bottom: 1px solid white;' : '') + 'height: ' + modifiedHeight + 'px;"></span>';
            times_h += '<span data-hint="' + time.removed + ' removed" ' + ((!time.removed) ? 'style="border:none !important;"' : '') + ' class="removed_h hint--right hint--error" style="height: ' + removedHeight + 'px;"></span>';
            html += '<div class="time-' + timeIndex.replace('.', 'p') + '" style="left: ' + (SCALE * 61 * parseFloat(timeIndex)) + 'px;">' + times_h + '</div>';
        }
        document.getElementById('wrapper-timeline').style.fontSize = SCALE+'em';
        //document.getElementById('timeline').style.backgroundSize = (SCALE*61)+'px';
        document.getElementById('timeline').style.height = (SCALE*100+10)+'px';
        document.getElementById('timeline').innerHTML = timelineBaseHTML + html;

        function fixCode(v0:string) {
            if(v0[0]=='`' && v0.split('').reduce((i,c)=>(i+(c=='`'?1:0)),0)%2==1) {
                return v0+'`';
            } else {
                return v0;
            }
        }
    }

    var setTimelineSeconds = function (s) {
        var v = START_TIME;
        var html = '';
        for (var i = 0; i <= s; i++) {
            var left = SCALE * ((i) ? ((i * 61) - (4 * i.toString().length)) : i);
            html += '<span style="left: ' + left + 'px;">' + v + 's</span>';
            v++;
        }
        document.querySelectorAll('.seconds-list')[0].innerHTML = html;
        document.getElementById('timeline').style.width = SCALE * (61 * (s + 1)) + 'px';
    }

    var setTimeline = function (timeline : DashboardDataForEntry[]) {
        setNumberChanges(timeline);
        setChanges(timeline);
        setTimelineSeconds(TIMELINE_SECONDS);
    }

    var filterChanges = function (timeline, type = undefined) {
        setNumberChanges(timeline);
        $('.acc-tr').each(function (i) {
            var time = parseFloat($(this).data('time'));
            if ($('#filter-changes').css('display') == 'none' || (time >= $('#filter-changes').find('.from').val() && time <= $('#filter-changes').find('.to').val())) {
                $(this).removeClass('hide-change').addClass('show-change');
            } else {
                $(this).removeClass('show-change').addClass('hide-change');
            }
        });
        $(".accordion-changes").animate({ scrollTop: $('.show-change').first().data('id') * 44 }, ((type == 'resize' || type == 'draggable') ? 0 : 500));
    }

    var levChanged = function (type = undefined) {
        if (parseInt(document.getElementById('lev').style.width) > 0) {
            $('#lev').css('border-width', '2px');
            $('#filter-changes').show();
            $('#filter-changes').find('.from').val(($('.lev').position().left / (SCALE*61)).toFixed(2));
            $('#filter-changes').find('.to').val((($('.lev').position().left + parseInt(document.getElementById('lev').style.width)) / (SCALE*61)).toFixed(2));
        } else {
            $('#lev').css('border-width', '1px');
            $('#filter-changes').hide();
        }
        filterChanges(timeline, type);
    }

    var escapeHtml = function (str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;")
            .replace(/\//g, "&#x2F;");
    }
    
    var escapeHtml2 = function (str) {
        return escapeHtml(str).replace(/`([^`]*)`/g,'<code>$1</code>');
    }

    var validate = window["validateInputNumber"] = function (evt) {
        var theEvent = evt || window.event;
        var key = theEvent.keyCode || theEvent.which;
        key = String.fromCharCode(key);
        var regex = /[0-9]|\./;
        if (!regex.test(key)) {
            theEvent.returnValue = false;
            if (theEvent.preventDefault) theEvent.preventDefault();
        }
    }

    var countByType = function (type, timeline) {
        var count = 0;
        for (var i = 0, len = timeline.length; i < len; i++) {
            if (timeline[i].type == type) {
                if ($('#filter-changes').css('display') == 'none' || (timeline[i].time >= $('#filter-changes').find('.from').val() && timeline[i].time <= $('#filter-changes').find('.to').val())) {
                    count++;
                }
            }
        }
        return count;
    }

    var timeline: DashboardDataForEntry[] = [];
    setTimeline(timeline);

    var selectable = function () {
        $('#timeline').selectable({
            stop: function (e) {
                if (e.toElement.id == 'offsetW') {
                    var selectXW = (e.offsetX < 0) ? 0 : e.offsetX;
                    $('.lev').css({
                        width: (selectXW > selectX) ? selectXW - selectX : selectX - selectXW,
                        left: (selectXW > selectX) ? selectX : selectXW,
                    });
                    levChanged('selectable');
                }
                $('#offsetW').hide();
            },
            start: function (e, ui) {
                $('#offsetW').show();
                selectX = e.offsetX;
            },
            filter: '.noselectee',
        });
    }

    var selectX;

    selectable();

    $('#filter-changes input').bind('keypress', function (e) {
        var toVal = $('#filter-changes .to').val();
        var fromVal = $('#filter-changes .from').val();
        if (e.keyCode == 13 && !(toVal < 0 || fromVal < 0 || toVal > TIMELINE_SECONDS || fromVal > TIMELINE_SECONDS)) {
            $('#lev').css({ left: ($('#filter-changes .from').val() * (SCALE*61)), width: ($('#filter-changes .to').val() * (SCALE*61)) - ($('#filter-changes .from').val() * (SCALE*61)) });
            levChanged();
        }
    });

    $('#node-changes input').on('keyup', function () {
        var value = this.value;
        $('.accordion-changes .acc-tr').hide().each(function () {
            if ($(this).text().search(value) > -1) {
                $(this).show();
            }
        });
    });

    $(".lev").draggable({
        axis: 'x',
        containment: 'parent',
        handle: '.drag-lev',
        drag: function (e) {
            levChanged('draggable');
        }
    });

    var x, y, top, left, down;

    $(".seconds-list").mousedown(function (e) {
        e.preventDefault();
        down = true;
        x = e.pageX;
        y = e.pageY;
        top = $("#wrapper-timeline").scrollTop();
        left = $("#wrapper-timeline").scrollLeft();
    });

    $("body").mousemove(function (e) {
        if (down) {
            var newX = e.pageX;
            var newY = e.pageY;

            $("#wrapper-timeline").scrollTop(top - newY + y);
            $("#wrapper-timeline").scrollLeft(left - newX + x);
        }
    });

    $("body").mouseup(function (e) { down = false; });

    $("#colorblind").change(function () {
        if (!this.checked) {
            $('#dom-recorder').removeClass('colorblind-on').addClass('colorblind-off');
        } else {
            $('#dom-recorder').removeClass('colorblind-off').addClass('colorblind-on');
        }
    });

    $('#filter-changes').find('a').click(function (e) {
        e.preventDefault();
        $('#lev').css('width', '0px');
        levChanged('reset');
    });

    var element = document.getElementById('lev');

    var resizerE = document.getElementsByClassName('lev2')[0];
    resizerE.addEventListener('mousedown', initResizeE, false);

    function initResizeE(e) {
        $("#timeline").selectable('destroy');
        window.addEventListener('mousemove', ResizeE, false);
        window.addEventListener('mouseup', stopResizeE, false);
    }

    function ResizeE(e) {
        levChanged('resize');
        element.style.width = ((e.clientX - $('#timeline').offset().left) - $('.lev').position().left) + 'px';
    }

    function stopResizeE(e) {
        selectable();
        window.removeEventListener('mousemove', ResizeE, false);
        window.removeEventListener('mouseup', stopResizeE, false);
    }

    var baseX;
    var baseW;
    var resizerW = document.getElementsByClassName('lev1')[0];
    resizerW.addEventListener('mousedown', initResizeW, false);

    function initResizeW(e) {
        $("#timeline").selectable('destroy');
        baseX = e.clientX - $('#timeline').offset().left;
        baseW = parseInt(element.style.width);
        window.addEventListener('mousemove', ResizeW, false);
        window.addEventListener('mouseup', stopResizeW, false);
    }

    function ResizeW(e) {
        levChanged('resize');
        if (baseX < (e.clientX - $('#timeline').offset().left)) {
            element.style.width = (baseW - ((e.clientX - $('#timeline').offset().left - baseX))) + 'px';
        } else {
            element.style.width = (baseW + (baseX - (e.clientX - $('#timeline').offset().left))) + 'px';
        }

        if (e.clientX - $('#timeline').offset().left < 0) {
            element.style.left = '0px';
        } else {
            element.style.left = ((e.clientX - $('#timeline').offset().left)) + 'px';
        }
    }

    function stopResizeW(e) {
        selectable();
        window.removeEventListener('mousemove', ResizeW, false);
        window.removeEventListener('mouseup', stopResizeW, false);
    }
    
    return {
        setTimeline: setTimeline
    };
    
}