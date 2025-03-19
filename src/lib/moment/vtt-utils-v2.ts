// @ts-nocheck

import webvtt from "@voctrolabs/node-webvtt";

const regExps = {
  speaker: /<v.*?(.*?)>/, // https://www.w3.org/TR/webvtt1/#webvtt-cue-voice-span
  style: /<emphasis level="(?<style>.*?)">/,
  tags: /<.*?>/g,
  duration: /<prosody duration="(?<duration>.*?)ms">(?<text>.*?)<\/prosody>/,
};

class FormatError extends Error {}
class CompatibilityError extends Error {}
class CompatibilityTimesError extends Error {}

function formatTime(duration) {
  let seconds = Number.parseInt(duration % 60),
    minutes = Number.parseInt((duration / 60) % 60),
    hours = Number.parseInt((duration / (60 * 60)) % 24),
    milliseconds = Number.parseInt(
      ((duration % 60) - seconds).toFixed(3) * 1000,
    );

  hours = hours < 10 ? "0" + hours : hours;
  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;
  milliseconds =
    milliseconds < 100
      ? milliseconds < 10
        ? "00" + milliseconds
        : "0" + milliseconds
      : milliseconds;

  return hours + ":" + minutes + ":" + seconds + "." + milliseconds;
}

function createTextFromCues(cues) {
  const NEWLINE = "\r\n";
  const ARROW = " --> ";
  let outputText = "WEBVTT" + NEWLINE + NEWLINE;
  for (let i = 0; i < cues.length - 1; i++) {
    outputText +=
      (i + 1).toString() +
      NEWLINE +
      formatTime(cues[i].start) +
      ARROW +
      formatTime(cues[i].end) +
      NEWLINE +
      cues[i].text +
      NEWLINE +
      NEWLINE;
  }

  outputText +=
    cues.length.toString() +
    NEWLINE +
    formatTime(cues[cues.length - 1].start) +
    ARROW +
    formatTime(cues[cues.length - 1].end) +
    NEWLINE +
    cues[cues.length - 1].text +
    NEWLINE;

  return outputText;
}

class Sentence {
  constructor(text = "", start = 0.0, end = 0.0, synthFlag = true) {
    this.synthesize = synthFlag;
    this.text = text;
    this.start = Number.parseFloat(start.toFixed(3));
    this.end = Number.parseFloat(end.toFixed(3));
  }
}

class SpeakerContent {
  constructor(language, model, defaultStyle) {
    // constructor
    this.language = language;
    if (model !== null) {
      this.model = model;
    }
    if (defaultStyle !== null) {
      this.defaultStyle = defaultStyle;
    }
    this.sentences = [];
  }
}

function getModelForSpeaker(models, speaker) {
  for (let i = 0; i < models.length; i++) {
    if (models[i][0] === speaker) {
      return models[i][1];
    }
  }
  return undefined;
}

function getDefaultStyleForSpeaker(models, speaker) {
  for (let i = 0; i < models.length; i++) {
    if (models[i][0] === speaker && models[i].length > 2) {
      return models[i][2];
    } else {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Generates a VTT-formatted subtitle from a SRT text
 * @param  {String} inputSrtText Input subtitle text, in SRT format
 * @return {String}              Output subtitle text, in VTT format
 */
function srtToVtt(inputSrtText) {
  inputSrtText = inputSrtText.replace(/[\u200B-\u200D\uFEFF]/g, ""); //removes zero-width chars
  // Change commas in text
  const reg = /[0-9](,)[0-9]/g;
  const commasMatches = inputSrtText.match(reg);

  for (let i = 0; i < commasMatches.length; i++) {
    inputSrtText = inputSrtText.replace(
      commasMatches[i],
      commasMatches[i].replace(",", "."),
    );
  }

  const NEWLINE = "\r\n";
  const outputText =
    "WEBVTT" + NEWLINE + NEWLINE + inputSrtText.trim() + NEWLINE;
  return outputText;
}

/**
 * Parses an input subtitle provided as text and output the subtitle with sentence per cue
 * @param  {String} inputVttText Input subtitle text, in VTT format
 * @return {String}              Output subtitle text, in VTT format
 */
function parseToSentences(inputVttText) {
  inputVttText = inputVttText.replace(/[\u200B-\u200D\uFEFF]/g, ""); //removes zero-width chars
  let inputVtt;
  try {
    inputVtt = webvtt.parse(inputVttText);
  } catch (e) {
    throw new FormatError(e.message);
  }

  const newCues = [];

  for (let i = 0; i < inputVtt.cues.length; i++) {
    const cue = inputVtt.cues[i];
    // remove voice closing tags, unnecessary since we are going to have a single voice per cue
    cue.text = cue.text.replace(/<\/v>/g, "").trim();

    if (cue.text === "") {
      continue;
    }

    const endsWithPoint = false;

    let currentVoiceTag;
    if (cue.text.indexOf("<v") >= 0) {
      currentVoiceTag = cue.text.substring(
        cue.text.indexOf("<v"),
        cue.text.indexOf(">") + 1,
      );
    } else {
      //default
      currentVoiceTag = "<v Speaker1>";
    }

    const separators = ["\\. ", "\\? ", "\\! "];
    const reg = new RegExp(separators.join("|"), "g");
    const endChars = [".", "!", "?"];
    // more than one sentence in fragment
    if (
      cue.text.indexOf(". ") >= 0 ||
      cue.text.indexOf("? ") >= 0 ||
      cue.text.indexOf("! ") >= 0
    ) {
      const sentences = cue.text.split(reg);
      const tokens = cue.text.match(reg);
      let proportion = 0.0; // we use this to keep track of how much of the sentence is read after each division
      for (let j = 0; j < sentences.length; j++) {
        if (j < sentences.length - 1) {
          sentences[j] += tokens[j];
        }
        const newCue = Object.assign({}, cue);
        if (sentences[j].indexOf("<v") >= 0) {
          currentVoiceTag = sentences[j].substring(
            sentences[j].indexOf("<v"),
            sentences[j].indexOf(">") + 1,
          );
          newCue.text = sentences[j];
        } else {
          newCue.text = currentVoiceTag + sentences[j];
        }

        newCue.text = newCue.text.trim();

        newCue.start = cue.start + proportion * (cue.end - cue.start);
        // update proportion value based on number of chars in the divided sentence
        proportion += sentences[j].length / cue.text.length;
        newCue.end = cue.start + proportion * (cue.end - cue.start);
        // If it does not finish sentence, store it in the original cue to proceed joining with next one
        if (endChars.indexOf(newCue.text.slice(-1)) == -1) {
          inputVtt.cues[i] = newCue;
          i = i - 1;
        } else {
          newCues.push(newCue);
        }
      }
    }
    // Fragment does not contain a complete sentence
    else if (endChars.indexOf(cue.text.slice(-1)) == -1) {
      // Incorporate duration (ms) information to the cue text
      cue.text =
        '<prosody duration="' +
        Number.parseInt(1000 * (cue.end - cue.start)).toString() +
        'ms">' +
        cue.text +
        "</prosody>";
      let foundEndChar = false;
      let cueIdx = 1;
      while (!foundEndChar) {
        const nextCue = inputVtt.cues[i + cueIdx];
        // Remove voice tag from text if present, since already in previous cue
        nextCue.text = nextCue.text.replace(/<\/v>/g, "").trim();

        // Next fragment has several sentences. We take the 1st and continue
        if (nextCue.text.match(reg)) {
          foundEndChar = true;
          const foundSeparator = nextCue.text.match(reg)[0];

          const newCue = Object.assign({}, cue);

          // Add break if cues are not adjacent in time
          if (newCue.end != nextCue.start) {
            newCue.text +=
              '<break time="' +
              Number.parseInt(1000 * (nextCue.start - newCue.end)).toString() +
              'ms"/>';
          }

          // TODO Computing new times based on number of sentences in cue. Improve (e.g. using nr of chars)
          const proportion =
            (nextCue.text.split(foundSeparator)[0] + foundSeparator).length /
            nextCue.text.length;
          const nextCueFragmentDuration =
            (nextCue.end - nextCue.start) * proportion;
          const nextCueFragmentText =
            '<prosody duration="' +
            Math.round(1000 * nextCueFragmentDuration).toString() +
            'ms"> ' +
            nextCue.text.split(foundSeparator)[0] +
            foundSeparator[0] +
            "</prosody>";

          if (cue.text.indexOf("<v") >= 0) {
            currentVoiceTag = cue.text.substring(
              cue.text.indexOf("<v"),
              cue.text.indexOf(">") + 1,
            );
            newCue.text = cue.text + nextCueFragmentText;
          } else {
            newCue.text = currentVoiceTag + cue.text + nextCueFragmentText;
          }

          newCue.end = nextCue.start + nextCueFragmentDuration;

          newCues.push(newCue);
          inputVtt.cues[i + cueIdx].text = nextCue.text.substring(
            nextCue.text.search("\\" + foundSeparator) + 2,
          );
          inputVtt.cues[i + cueIdx].start = newCue.end;

          // Next fragment contains the rest of the sentence
        } else if (endChars.indexOf(nextCue.text.slice(-1)) > -1) {
          foundEndChar = true;
          const newCue = Object.assign({}, cue);

          // Add break if cues are not adjacent in time
          if (newCue.end != nextCue.start) {
            newCue.text +=
              '<break time="' +
              Number.parseInt(1000 * (nextCue.start - newCue.end)).toString() +
              'ms"/>';
          }
          // Add duration tag
          nextCue.text =
            '<prosody duration="' +
            Number.parseInt(1000 * (nextCue.end - nextCue.start)).toString() +
            'ms"> ' +
            nextCue.text +
            "</prosody>";
          newCue.text += nextCue.text.replace(currentVoiceTag, "");
          newCue.end = nextCue.end;
          if (newCue.text.indexOf("<v") < 0) {
            newCue.text = currentVoiceTag + newCue.text;
          }
          newCues.push(newCue);
          i += cueIdx;
        } else {
          // Add break if cues are not adjacent in time
          if (cue.end != nextCue.start) {
            cue.text +=
              '<break time="' +
              Number.parseInt(1000 * (nextCue.start - cue.end)).toString() +
              'ms"/>';
          }
          // Add duration tag
          nextCue.text =
            '<prosody duration="' +
            Number.parseInt(1000 * (nextCue.end - nextCue.start)).toString() +
            'ms"> ' +
            nextCue.text +
            "</prosody>";
          cue.end = nextCue.end;
          cue.text += nextCue.text;
          cueIdx++;
        }
      }
    } else {
      if (cue.text.indexOf("<v") < 0) {
        cue.text = currentVoiceTag + cue.text;
      }
      newCues.push(cue);
    }
  }

  return createTextFromCues(newCues);
}

/**
 * Checks that the number of cues in two VTT subtitles are equal
 * @param  {String} srcVttText    Source subtitle text, in VTT format
 * @param  {String} targetVttText Target subtitle text, in VTT format
 * @return {Boolean}              True if both are equivalent, false otherwise
 */
function checkSubtitlesEquivalency(srcVttText, targetVttText) {
  srcVttText = srcVttText.replace(/[\u200B-\u200D\uFEFF]/g, ""); //removes zero-width chars
  targetVttText = targetVttText.replace(/[\u200B-\u200D\uFEFF]/g, ""); //removes zero-width chars

  var srcVtt;
  try {
    srcVtt = webvtt.parse(srcVttText);
  } catch (e) {
    throw new FormatError("Error in src subtitle: " + e.message);
  }

  var targetVtt;
  try {
    targetVtt = webvtt.parse(targetVttText);
  } catch (e) {
    throw new FormatError("Error in target subtitle: " + e.message);
  }

  if (srcVtt.cues.length != targetVtt.cues.length) {
    throw new CompatibilityError(
      "Subtitles have different number of cues (" +
        srcVtt.cues.length.toString() +
        " and " +
        targetVtt.cues.length +
        ")",
    );
  }

  return true;
}

/**
 * Checks that the start and end times of cues in two VTT subtitles are equal
 * @param {String} srcVttText       Source subtitle text, in VTT format
 * @param {String} targetVttText    Target subtitle text, in VTT format
 * @param {Number} tolerance        Allowed differences in times between subtitles, in seconds
 * @return {Boolean}                True if both are equivalent, false otherwise
 */
function checkSubtitlesTimesEquivalency(srcVttText, targetVttText, tolerance) {
  srcVttText = srcVttText.replace(/[\u200B-\u200D\uFEFF]/g, ""); //removes zero-width chars
  targetVttText = targetVttText.replace(/[\u200B-\u200D\uFEFF]/g, ""); //removes zero-width chars

  var srcVtt;
  try {
    srcVtt = webvtt.parse(srcVttText);
  } catch (e) {
    throw new FormatError("Error in src subtitle: " + e.message);
  }

  var targetVtt;
  try {
    targetVtt = webvtt.parse(targetVttText);
  } catch (e) {
    throw new FormatError("Error in target subtitle: " + e.message);
  }

  for (let i = 0; i < srcVtt.cues.length; i++) {
    if (
      Math.abs(srcVtt.cues[i].start - targetVtt.cues[i].start) > tolerance ||
      Math.abs(srcVtt.cues[i].end - targetVtt.cues[i].end) > tolerance
    ) {
      throw new CompatibilityTimesError(
        "Start and end times differ at cue " + (i + 1).toString(),
      );
    }
  }
  return true;
}

/**
 * Updates the start and end times of the cue indicated by cueIdx
 * @param  {String} inputVttText Input subtitle text, in VTT format
 * @param  {Number} cueIdx       Index of the cue where the style must be applied (first cue = index 0)
 * @param  {Number} startTime    New start time, in seconds
 * @param  {Number} endTime      New end time, in seconds
 * @return {String}              inputVttText modified
 */
function updateCueTimes(inputVttText, cueIdx, startTime, endTime) {
  inputVttText = inputVttText.replace(/[\u200B-\u200D\uFEFF]/g, ""); //removes zero-width chars
  cueIdx = Number.parseInt(cueIdx);
  const inputVtt = webvtt.parse(inputVttText);
  inputVtt.cues[cueIdx].text = startTime;
  inputVtt.cues[cueIdx].end = endTime;

  return createTextFromCues(inputVtt.cues);
}

/**
 * Updates the start and end times of the cue indicated by cueIdx
 * @param  {String} inputVttText Input subtitle text, in VTT format
 * @param  {Number} cueIdx       Index of the cue where the style must be applied (first cue = index 0)
 * @param  {String} newText      New text for the cue
 * @return {String}              inputVttText modified
 */
function updateCueText(inputVttText, cueIdx, newText) {
  inputVttText = inputVttText.replace(/[\u200B-\u200D\uFEFF]/g, ""); //removes zero-width chars
  cueIdx = Number.parseInt(cueIdx);
  const inputVtt = webvtt.parse(inputVttText);

  // Check if there is a speaker tag, to keep it.
  const speakerTagMatch = regExps["speaker"].exec(inputVtt.cues[cueIdx].text);

  if (speakerTagMatch) {
    inputVtt.cues[cueIdx].text = speakerTagMatch[0] + newText;
  } else {
    inputVtt.cues[cueIdx].text = newText;
  }

  return createTextFromCues(inputVtt.cues);
}

/**
 * Adds a tag with an attribute an its value to the cue in position cueIdx for the VTT-formatted subtitle inputVttText surrounding the text by '<tag attribute="value">' and </tag>.
 * @param  {String} inputVttText Input subtitle text, in VTT format
 * @param  {Number} cueIdx       Index of the cue where the style must be applied (first cue = index 0)
 * @param  {String} tag          Name of the tag
 * @param  {String} attribute    Name of the attribute
 * @param  {String} value        Value for the attribute
 * @return {String}              inputVttText modified
 */
function addTagToCue(inputVttText, cueIdx, tag, attributeName, attributeValue) {
  inputVttText = inputVttText.replace(/[\u200B-\u200D\uFEFF]/g, ""); //removes zero-width chars
  cueIdx = Number.parseInt(cueIdx);
  const inputVtt = webvtt.parse(inputVttText);
  const tagOpeningText =
    "<" + tag + " " + attributeName + '="' + attributeValue + '">';
  const tagClosingText = "</" + tag + ">";

  // Check if there is a speaker tag, to remove it from the text and add it again at the end
  const speakerTagMatch = regExps["speaker"].exec(inputVtt.cues[cueIdx].text);

  if (speakerTagMatch) {
    inputVtt.cues[cueIdx].text = inputVtt.cues[cueIdx].text.replace(
      speakerTagMatch[0],
      "",
    );
  }

  const tagRegExp = new RegExp(
    "<" + tag + " " + attributeName + '="(?<value>.*)">',
  );
  const match = tagRegExp.exec(inputVtt.cues[cueIdx].text);

  if (match) {
    // if the tag was already there, just replace the attributeValue
    inputVtt.cues[cueIdx].text = inputVtt.cues[cueIdx].text.replace(
      match[1],
      attributeValue,
    );
  } else {
    // otherwise, add it
    inputVtt.cues[cueIdx].text =
      tagOpeningText + inputVtt.cues[cueIdx].text + tagClosingText;
  }

  if (speakerTagMatch) {
    inputVtt.cues[cueIdx].text =
      speakerTagMatch[0] + inputVtt.cues[cueIdx].text;
  }

  return createTextFromCues(inputVtt.cues);
}

/**
 * Assigns a style to the cue in position cueIdx for the VTT-formatted subtitle inputVttText by adding a '<emphasis level="style">' tag to the cue.
 * @deprecated since version 0.10
 * @param  {String} inputVttText Input subtitle text, in VTT format
 * @param  {String} style        Name of the style for the cue (e.g: 'neutral', 'sad', 'aggresive'...)
 * @param  {Number} cueIdx       Index of the cue where the style must be applied (first cue = index 0)
 * @return {String}              inputVttText modified
 */
function assignStyleToCue(inputVttText, style, cueIdx) {
  inputVttText = inputVttText.replace(/[\u200B-\u200D\uFEFF]/g, ""); //removes zero-width chars
  style = "voiceful:" + style;
  cueIdx = Number.parseInt(cueIdx);
  const inputVtt = webvtt.parse(inputVttText);
  const emphTag = '<emphasis level="' + style + '">';
  const match = regExps["style"].exec(inputVtt.cues[cueIdx].text);
  const speakerTagMatch = regExps["speaker"].exec(inputVtt.cues[cueIdx].text);

  if (speakerTagMatch) {
    inputVtt.cues[cueIdx].text = inputVtt.cues[cueIdx].text.replace(
      speakerTagMatch[0],
      "",
    );
  }

  if (match) {
    inputVtt.cues[cueIdx].text = inputVtt.cues[cueIdx].text.replace(
      match[0],
      emphTag,
    );
  } else {
    inputVtt.cues[cueIdx].text =
      emphTag + inputVtt.cues[cueIdx].text + "</emphasis>";
  }

  if (speakerTagMatch) {
    inputVtt.cues[cueIdx].text =
      speakerTagMatch[0] + inputVtt.cues[cueIdx].text;
  }

  return createTextFromCues(inputVtt.cues);
}

function getSpeaker(cueText) {
  const match = regExps["speaker"].exec(cueText);
  return match[1].trim();
}

/**
 * Returns the number of cues in the vtt subtitle vttText
 * @param  {String} vttText Subtitle text, in VTT format
 * @return {Number}         Number of cues
 */
function getNumberOfCues(vttText) {
  vttText = vttText.replace(/[\u200B-\u200D\uFEFF]/g, ""); //removes zero-width chars
  const vtt = webvtt.parse(vttText);
  return vtt.cues.length;
}

/**
 * Returns the different speakers present in the VTT formated subtitle vttText, looking at the voice ('<v>') tags in the cues.
 * @param  {String}     vttText Subtitle text, in VTT format
 * @return {String[]}           Array of speakers
 */
function getSpeakers(vttText) {
  vttText = vttText.replace(/[\u200B-\u200D\uFEFF]/g, ""); //removes zero-width chars
  const vtt = webvtt.parse(vttText);
  const speakers = new Map();
  vtt.cues.forEach((cue) => speakers.set(getSpeaker(cue.text), true));
  return Array.from(speakers.keys());
}

// Return the style of a cue
function getStyle(cueText) {
  const match = regExps["style"].exec(cueText);
  return match ? match[1] : match;
}

/**
 * Generates JSON-formatted to generate synthesis with voiceful
 * @param  {String}      language            Language identifier
 * @param  {String}      modelsString        Array with speakers-voice models-(optional)defaultStyle correspondence (e.g. '[["speaker1","model1","style1"],["speaker2","model2"]]')
 * @param  {String}      vttText             Subtitle text, in VTT format
 * @param  {Number[]}    selectedSentences   Array with indexes of sentences to be synthesized (if none given, all are synthesized)
 * @return {String}                          JSON-formatted string for synthesis
 */
function getAsJSON(language, modelsString, vttText, selectedSentences = []) {
  vttText = vttText.replace(/[\u200B-\u200D\uFEFF]/g, ""); //removes zero-width chars

  const output = new Object();
  output.speakers = new Object();

  const models = JSON.parse(modelsString);

  const vtt = webvtt.parse(vttText);

  for (let i = 0; i < vtt.cues.length; i++) {
    const cue = vtt.cues[i];
    const speaker = getSpeaker(cue.text);
    if (!output.speakers.hasOwnProperty(speaker)) {
      output.speakers[speaker] = new SpeakerContent(
        language,
        getModelForSpeaker(models, speaker),
        getDefaultStyleForSpeaker(models, speaker),
      );
    }

    var synthFlag = false;
    if (selectedSentences.includes(i + 1) || selectedSentences.length == 0) {
      synthFlag = true;
    }

    const sentence = new Sentence(
      removeSpeaker(cue.text),
      cue.start,
      cue.end,
      synthFlag,
    );
    output.speakers[speaker].sentences.push(sentence);
  }

  return JSON.stringify(output);
}

/**
 * Return the text of a cue without speaker tag
 * @param  {String} cueText Text from a sentence of a subtitle
 * @return {String}         cueText without the speaker tag
 */
function removeSpeaker(cueText) {
  return cueText.replace(regExps["speaker"], "");
}

/**
 * Return the text of a cue without any tags
 * @param  {String} cueText Text from a sentence of a subtitle
 * @return {String}         cueText without tags
 */
function removeTags(cueText) {
  return cueText.replace(regExps["tags"], "");
}

/**
 * Return noise gate values as string to introduce in VoMix effect
 * @param  {String} vttText Subtitle text, in VTT format
 * @param  {Number} transitionTime Transition time, in seconds
 * @return {String}              Noise gate values as string to introduce in JSON
 */
function generateNoiseGateString(vttText, transitionTime) {
  vttText = vttText.replace(/[\u200B-\u200D\uFEFF]/g, ""); //removes zero-width chars

  const vtt = webvtt.parse(vttText);
  const points = [];

  for (var i = 0; i < vtt.cues.length; i++) {
    // Check if we need to add in points
    const currentStart = vtt.cues[i].start;
    const currentEnd = vtt.cues[i].end;
    let previousEnd = 0.0;
    if (i > 0) {
      previousEnd = vtt.cues[i - 1].end;
    }
    let nextStart = vtt.cues[i].end + transitionTime;
    if (i < vtt.cues.length - 1) {
      nextStart = vtt.cues[i + 1].start;
    }

    if (currentStart - transitionTime > previousEnd + transitionTime) {
      points.push([currentStart - transitionTime, 1.0]);
      points.push([currentStart, 0.0]);
    }

    // Check if we need to add out points
    if (currentEnd + transitionTime < nextStart - transitionTime) {
      points.push([currentEnd, 0.0]);
      points.push([currentEnd + transitionTime, 1.0]);
    }
  }

  return JSON.stringify(points);
}

/**
 * Returns the subtitle with cues short enough that they are readable together with video
 * @param   {String} vttText    Subtitle text, in VTT format
 * @return  {String}            Video-friendly subtitle, in VTT format
 */
function getVideoFriendlyVtt(vttText) {
  vttText = vttText.replace(/[\u200B-\u200D\uFEFF]/g, ""); //removes zero-width chars

  let vtt;
  try {
    vtt = webvtt.parse(vttText);
  } catch (e) {
    throw new FormatError(e.message);
  }

  const newCues = [];
  const durationRegex = RegExp(regExps["duration"], "g");

  const useDurationTags = durationRegex.exec(vttText) != null;

  for (let i = 0; i < vtt.cues.length; i++) {
    const cue = vtt.cues[i];

    let match;
    let noDurationTags = true;
    let durationSum = 0.0;

    while ((match = durationRegex.exec(cue.text)) !== null) {
      noDurationTags = false;
      const startTime = durationSum / 1000.0 + cue.start;
      durationSum += Number.parseFloat(match[1]);
      const endTime = startTime + match[1] / 1000.0;
      const text = match[2].trim();

      const newCue = Object.assign({}, cue);
      newCue.start = startTime;
      newCue.end = endTime;
      newCue.text = removeTags(text).trim();
      newCues.push(newCue);
    }

    if (noDurationTags) {
      if (cue.text.length > 70 && !useDurationTags) {
        // TODO assuming we won't have 3 sentences, just 2
        cue.text = removeTags(cue.text).trim();

        const separationSpaceIndex = cue.text.substring(0, 69).lastIndexOf(" ");
        const firstCueText = cue.text.substring(0, separationSpaceIndex);
        const secondCueText = cue.text.substring(
          separationSpaceIndex + 1,
          cue.text.length,
        );
        const separationTime =
          cue.start +
          (separationSpaceIndex / cue.text.length) * (cue.end - cue.start);

        const firstCue = Object.assign({}, cue);
        firstCue.start = cue.start;
        firstCue.end = separationTime;
        firstCue.text = firstCueText;
        newCues.push(firstCue);

        const secondCue = Object.assign({}, cue);
        secondCue.start = separationTime;
        secondCue.end = cue.end;
        secondCue.text = secondCueText;
        newCues.push(secondCue);

        // No need to rearrange, just push as is
      } else {
        cue.text = removeTags(cue.text).trim();
        newCues.push(cue);
      }
    }
  }

  return createTextFromCues(newCues);
}

export {
  CompatibilityError,
  CompatibilityTimesError,
  FormatError,
  formatTime,
  assignStyleToCue,
  getVideoFriendlyVtt,
  addTagToCue,
  updateCueTimes,
  updateCueText,
  getNumberOfCues,
  checkSubtitlesEquivalency,
  checkSubtitlesTimesEquivalency,
  generateNoiseGateString,
  getSpeaker,
  getSpeakers,
  getStyle,
  getAsJSON,
  parseToSentences,
  removeSpeaker,
  removeTags,
  srtToVtt,
  webvtt,
};
