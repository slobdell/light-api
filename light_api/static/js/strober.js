/*
 * <script src="http://cdn.pubnub.com/pubnub-3.7.12.min.js"></script>
* <script type="text/javascript" src="jquery-2.1.4.min.js"></script>
*/
    function shuffle(array) {
        var currentIndex = array.length, temporaryValue, randomIndex ;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }

        return array;
    }
    var MIN_CONFIDENCE = 0.1;
    var MIN_DECIBELS = -50;
    var JITTER_TIME = 2000;
    var MESSAGE_TYPE_FLASH = 1;
    var MESSAGE_TYPE_CHANNEL_ASSIGNMENT = 2;
    var MAX_SET_TIMEOUT = 0;
    // TODO need to update the base channel name
    var CHANNEL_NAME = "new_channel_name"

    var Class = function(methods) {
        var klass = function() {
            this.initialize.apply(this, arguments);
        };

        for (var property in methods) {
        klass.prototype[property] = methods[property];
        }

        if (!klass.prototype.initialize) klass.prototype.initialize = function(){};

        return klass;
    };

    var ChannelDistributor = Class({
        numOccupants: 0,
        numChannels: 0,
        channelInflectionPoint: 4,
        maxPossibleChannels: 12,
        channelNames: [],
        currentChannel: 0,
        bufferedRemovals: 0,
        initialize: function() {
            for(var i=0; i<this.numChannels; i++){
                this.channelNames.push("" + i)
            }
        },
        addOccupant: function(){
            if(this.bufferedRemovals > 0){
                this.bufferedRemovals--;
                return;
            }
            this.numOccupants++;
            if(this.numChannels >= this.channelInflectionPoint){
                if(this.numOccupants / this.numChannels >= this.numChannels){
                    // we need to add a new channel.  Carry on.
                } else {
                    return;
                }
            }
            if(this.numChannels >= this.maxPossibleChannels){
                return;
            }
            this.channelNames.push("" + this.numChannels);
            this.numChannels++;
        },
        annotateRemoval: function(){
            this.currentChannel = (this.currentChannel + this.numChannels - 1) % this.numChannels;
            this.bufferedRemovals++;
        },
        getNextChannelName: function(){
            this.currentChannel++;
            this.currentChannel = this.currentChannel % this.numChannels;
            return CHANNEL_NAME + this.channelNames[this.currentChannel];
        },
        getAllChannels: function(){
            if(this.numChannels === 0){
                return [CHANNEL_NAME + "_broadcast"];
            }
            var fullChannelNames = [];
            for(var i=0; i<this.channelNames.length; i++){
                fullChannelNames.push(CHANNEL_NAME + this.channelNames[i]);
            }
            return fullChannelNames;
        },
        getChannelForPitch: function(pitchValue){
            /* pitch is between 0 and 12 */
            if(this.numChannels === 0){
                return this.baseChannelName + "_broadcast";
            }
            var channelNumber = pitchValue % this.numChannels;
            return CHANNEL_NAME + this.channelNames[channelNumber];
        },
        getHalfChannels: function(pitchValue){
            if(this.numChannels === 0){
                return [CHANNEL_NAME + "_broadcast"];
            }
            var clone = this.channelNames.slice(0);
            shuffle(clone);
            var midpoint = Math.ceil(this.numChannels / 2);
            var channelSuffixes = clone.slice(0, midpoint);
            var fullChannelNames = [];
            for(var i=0; i<channelSuffixes.length; i++){
                fullChannelNames.push(CHANNEL_NAME + channelSuffixes[i]);
            }
            return fullChannelNames;
        }
    });

    var channelDistributor = new ChannelDistributor(CHANNEL_NAME);

    var publishKey = 'pub-c-77b610e9-6b6c-4193-85b1-50a3a249d263';
    var subscribeKey = 'sub-c-046d7292-8c71-11e4-8159-02ee2ddab7fe';

    var occupantsInitialState = -1;
    var pubnub = PUBNUB({
        subscribe_key: subscribeKey,
        publish_key: publishKey
    });
    var previousOccupantCount = 0;
    pubnub.subscribe({
    channel: CHANNEL_NAME,
    message: function(m){
        /*console.log(m);
        alert("got a message");
        */

    },
    error: function (error) {
        // Handle error here
        console.log(JSON.stringify(error));
    },
    presence: function(joinObject){
        var numListeners = joinObject.occupancy - 1;
        console.log(joinObject);
        console.log(occupantsInitialState);
        if(joinObject.action == "join"){
            if(numListeners === 0){
                // the javascript app itself will otherwise count as a listener
                return;
            }
            if(occupantsInitialState == numListeners){
                return; //only want to do this action once
            }
            if(occupantsInitialState == -1){
                occupantsInitialState = numListeners;
            }
            channelDistributor.addOccupant();
            var channelName = channelDistributor.getNextChannelName();
            pubnub.publish({
                channel : CHANNEL_NAME,
                message : {
                    type: MESSAGE_TYPE_CHANNEL_ASSIGNMENT,
                    channelName: channelName
                }
            })
        } else {
            channelDistributor.annotateRemoval();
            // they left
        }
    }
    });
function getScheduleMs(startable, startTimestamp){
    var scheduleTimestamp = startable.start * 1000;
    var now = new Date().getTime();
    var elapsedTime = now - startTimestamp;
    var offsetMs = scheduleTimestamp - (elapsedTime);
    return offsetMs;
}

function scheduleBar(bar, scheduleMs){
    //return;
    var result = setTimeout(function(){
        //probably light up everything
        // $("#fillMe").append("bar " + bar.start+" <br/>");
        var channels = channelDistributor.getAllChannels();
        for(var i=0; i<channels.length; i++){
            var channel = channels[i];
            pubnub.publish({
                channel : channel,
                message : {
                    type: MESSAGE_TYPE_FLASH,
                    intensity: bar.dominantPitch / 12.0,
                    duration: parseInt(bar.duration * 1000, 10),
                    jitterTime: JITTER_TIME
                }
            })
        }
    }, scheduleMs);
    MAX_SET_TIMEOUT = result;
}
function scheduleTatum(tatum, scheduleMs){
    //return;
    var result = setTimeout(function(){
        //probably light up just one
        // $("#fillMe").append("tatum " + tatum.start+" <br/>");
        var channel = channelDistributor.getChannelForPitch(tatum.dominantPitch);
        pubnub.publish({
            channel : channel,
            message : {
                type: MESSAGE_TYPE_FLASH,
                intensity: tatum.dominantPitch / 12.0,
                duration: parseInt(tatum.duration * 1000, 10),
                jitterTime: JITTER_TIME
            }
        })
    }, scheduleMs);
    MAX_SET_TIMEOUT = result;
}
function scheduleBeat(beat, scheduleMs){
    //probably light up half
    //return;
    var result = setTimeout(function(){
        //$("#fillMe").append("beat " + beat.start+" <br/>");
        var channels = channelDistributor.getHalfChannels(beat.dominantPitch);
        for(var i=0; i<channels.length; i++){
            var channel = channels[i];
            pubnub.publish({
                channel : channel,
                message : {
                    type: MESSAGE_TYPE_FLASH,
                    intensity: beat.dominantPitch / 12.0,
                    duration: parseInt(beat.duration * 1000, 10),
                    jitterTime: JITTER_TIME
                }
            })
        }
    }, scheduleMs);
    MAX_SET_TIMEOUT = result;
}

    function startRead(echoNestObject){
        var startTimestamp = new Date().getTime();
        var bars = echoNestObject.bars;
        var tatums = echoNestObject.tatums;
        var beats = echoNestObject.beats;
        // beats, segments, tatums
        var segments = echoNestObject.segments;

        // need to get the dominant pitch, hash to the number of subscribed phones, send to that phone
        var allObjects = bars.concat(tatums).concat(beats);
        for(var i=0; i < segments.length; i++){
            var segment = segments[i];
            var scheduleMs = getScheduleMs(segment, startTimestamp);
            var dominantPitch = segment.pitches.indexOf(1);
            if(dominantPitch == 0){
                var maxValue = 0.0;
                var bestIndex = 0;
                for (var j=1; j < segment.pitches.length; j++){
                    if (segment.pitches[j] > maxValue){
                        maxValue = segment.pitches[j];
                        bestIndex = j;
                    }
                }
                dominantPitch = bestIndex;
            }
            // FIXME this is really ineffficient but oh well
            for(var j=0; j< allObjects.length; j++){
                var musicObj = allObjects[j];
                if(musicObj.start >= segment.start){
                    musicObj.dominantPitch = dominantPitch;
                }
            }
        }

        var usedTimes = {};
        var tatumDurations = {};

        for(var i=0; i<tatums.length; i++){
            var tatum = tatums[i];
            tatumDurations[tatum.start] = tatum.duration;
        }


        for(var i=0; i<bars.length; i++){
            var bar = bars[i];
            if(bar.confidence >= MIN_CONFIDENCE){
                usedTimes[bar.start] = true;
                bar.duration = tatumDurations[bar.start];
                scheduleBar(bar, getScheduleMs(bar, startTimestamp));
            }
        }
        for(var i=0; i<beats.length; i++){
            var beat = beats[i];
            if(beat.start in usedTimes){
                continue;
            }
            if(beat.confidence >= MIN_CONFIDENCE){
                usedTimes[beat.start] = true;
                beat.duration = tatumDurations[beat.start];
                scheduleBeat(beat, getScheduleMs(beat, startTimestamp));
            }
        }
        for(var i=0; i<tatums.length; i++){
            var tatum = tatums[i];
            if(tatum.start in usedTimes){
                continue;
            }
            if(tatum.confidence >= MIN_CONFIDENCE){
                usedTimes[tatum.start] = true;
                scheduleTatum(tatum, getScheduleMs(tatum, startTimestamp));
            }
            else{
                console.log("DISCARD");
            }
        }
    };

function startFlashing(audio, analysisJson){
    console.log(analysisJson);
    setTimeout(function(){
        audio.play();
    }, JITTER_TIME);
    startRead(analysisJson);
}

function stopFlashing(){
    for(var i=0; i<=MAX_SET_TIMEOUT; i++){
        clearTimeout(i);
    }
}
