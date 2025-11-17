///Don't touch lines 2-43.
var order = 1; 
/// Helper function that shuffles an array. Don't touch.
var shuffle = function (array) {

	var currentIndex = array.length;
	var temporaryValue, randomIndex;
	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;

};
///Helper functions to get random selection from array, and to remove elements from array. Don't touch.
function getRandomNonDuplicateSelection(arr, count, exclusionArr) {
  var selected = [];
  var available = arr.filter(item => !exclusionArr.includes(item));

  if (available.length < count) {
    throw new Error('Insufficient unique elements available for selection.');
  }

  for (var i = 0; i < count; i++) {
    var randomIndex = Math.floor(Math.random() * available.length);
    selected.push(available[randomIndex]);
    available.splice(randomIndex, 1);
  }
  return selected;
}

function removeFromArray(arr, elements) {
  for (var i = 0; i < elements.length; i++) {
    var index = arr.indexOf(elements[i]);
    if (index > -1) {
      arr.splice(index, 1);
    }
  }
}

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////This section generates a list of sentence unique IDs, which represents the list of sentences to be presented to the participant. For each participant, a new list is generated.//////// 
////////If you follow my convention for sentence unique IDs, you will only need to update the values for number_of_conditions/lexicalizations/fillers.                                 //////// 
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/***** BUILD LISTS PER EXPERIMENT DESIGN (ID ranges) *****/
function shuffle(a){ for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

const ALL = window.all_stimuli;

// --- ID helpers ---
const isCriticalID   = id => id >= 1000 && id < 2000;      // critical acceptability
const isMainGoodID   = id => id >= 2001 && id <= 2016;     // fillers good
const isMainBadID    = id => id >= 2017 && id <= 2032;     // fillers bad

// ========== 4/16/4 split by lexicalization; NT fillers by ID (5/6) ==========

// helpers to derive lex (middle two digits) and cond (last digit)
function getLexFromID(uid){ return Math.floor((uid % 1000) / 10); } // 01..24

// 1) collect and shuffle the 24 lexicalizations (from critical 1000–1999)
const ALL_CRIT_IDS = ALL.filter(x => isCriticalID(x.unique_id)).map(x => x.unique_id);
const ALL_LEX = [...new Set(ALL_CRIT_IDS.map(getLexFromID))].sort((a,b)=>a-b); // 1..24
shuffle(ALL_LEX);

// 4/16/4 split (by *appearance order*): pre NT (4), acceptability (16), post NT (4)
const NT_LEX_PRE  = ALL_LEX.slice(0, 4);
const ACC_LEX     = ALL_LEX.slice(4, 20);
const NT_LEX_POST = ALL_LEX.slice(20, 24);

// helper: pick the single critical item for (lex, cond)
function pickCritical(lex, cond){
  const uid = 1000 + lex*10 + cond; 
  return ALL.find(x => x.unique_id === uid);
}

// 2) build Acceptability 16 critical with balanced cond 1..4 (each 4 times)
// group ACC_LEX into 4 groups (size 4) to align with cond 1..4
const ACC_GROUPS = [0,1,2,3].map(i => ACC_LEX.slice(i*4, i*4+4));
// for each block b=0..3 take one item from each condition group
const blocks_critical = [[],[],[],[]];
for (let b=0; b<4; b++){
  const c1 = pickCritical(ACC_GROUPS[0][b], 1);
  const c2 = pickCritical(ACC_GROUPS[1][b], 2);
  const c3 = pickCritical(ACC_GROUPS[2][b], 3);
  const c4 = pickCritical(ACC_GROUPS[3][b], 4);
  blocks_critical[b] = [c1,c2,c3,c4].filter(Boolean);
  shuffle(blocks_critical[b]); // light shuffle inside block
}

// 3) main fillers: per block 4 good + 4 bad (IDs 2001–2016, 2017–2032)
const goodIDs = shuffle(ALL.filter(x => isMainGoodID(x.unique_id)).map(x => x.unique_id)); // 16
const badIDs  = shuffle(ALL.filter(x => isMainBadID(x.unique_id)).map(x => x.unique_id));  // 16
const blocks_fillers = [0,1,2,3].map(b => {
  const g = goodIDs.slice(b*4,(b+1)*4);
  const d = badIDs.slice(b*4,(b+1)*4);
  const pack = g.concat(d);
  shuffle(pack);
  return pack.map(uid => ALL.find(x => x.unique_id === uid));
});

// 4) assemble main acceptability order: 4 blocks × (4 crit + 8 filler)
function buildBlock(critItems, fillerItems){
  // pattern: 12 items = 4C + 8F, no two criticals in a row
  const pattern = ['F','C','F','F','C','F','F','C','F','F','C','F'];
  const C = shuffle(critItems.slice());
  const F = shuffle(fillerItems.slice());
  const out = [];
  let ci = 0, fi = 0;
  for (const p of pattern){
    if (p === 'C') out.push(C[ci++]);
    else out.push(F[fi++]);
  }
  return out;
}

const main_order = [];
for (let b=0; b<4; b++){
  const block = buildBlock(blocks_critical[b], blocks_fillers[b]);
  main_order.push(...block);
}
window.main_order = main_order;


// 5) NT critical: 4/16/4 split
//    For each phase (4 lexicalizations), pick 2 with cond=5 (base) and 2 with cond=6 (negated).
function buildNTCrit(lexList){
  const L = shuffle(lexList.slice());       // 4 lex
  const to5 = L.slice(0,2), to6 = L.slice(2,4);
  const out = [];
  to5.forEach(lex => { const it = pickCritical(lex,5); if (it) out.push(it); });
  to6.forEach(lex => { const it = pickCritical(lex,6); if (it) out.push(it); });
  return out; // 4 items total
}
const NT_CRIT_PRE  = buildNTCrit(NT_LEX_PRE);
const NT_CRIT_POST = buildNTCrit(NT_LEX_POST);

// 6) NT fillers by item_type + polarity, with pair-level exclusivity across pre+post
const norm = v => String(v || "").trim().toLowerCase();

// Same question as belonging to the same pair
function ntPairKey(item){
  const txt = String(item.sentence || "").trim();
  const dotIdx = txt.lastIndexOf(".");
  const q = (dotIdx >= 0 ? txt.slice(dotIdx + 1) : txt)
              .replace(/\s+/g, " ")            // collapse spaces
              .replace(/[?.!]+$/,"")           // drop trailing punctuation
              .toLowerCase()
              .trim();
  return q; // e.g., "was there an ancient statue"
}

// All NT fillers by polarity
const NT_FILL_BASE_POOL_ALL = shuffle(
  ALL.filter(x => norm(x.item_type) === "filler_negation_test" && norm(x.polarity) === "base")
);
const NT_FILL_NEG_POOL_ALL  = shuffle(
  ALL.filter(x => norm(x.item_type) === "filler_negation_test" &&
                  (norm(x.polarity) === "negated" || norm(x.polarity) === "negation"))
);

// key
function takeDistinctByKey(pool, count, usedKeys){
  const out = [];
  for (const it of pool){
    const key = ntPairKey(it);
    if (!usedKeys.has(key)){
      out.push(it);
      usedKeys.add(key);
      if (out.length === count) break;
    }
  }
  return out;
}

// pre: 4 base + 4 negated
const usedPairKeysPre = new Set();
const NT_FILL_PRE_BASE = takeDistinctByKey(NT_FILL_BASE_POOL_ALL, 4, usedPairKeysPre);
const NT_FILL_PRE_NEG  = takeDistinctByKey(NT_FILL_NEG_POOL_ALL , 4, usedPairKeysPre);
const NT_FILL_PRE      = NT_FILL_PRE_BASE.concat(NT_FILL_PRE_NEG);

// post: 4 base + 4 negated
const NT_FILL_BASE_POOL_POST = NT_FILL_BASE_POOL_ALL.filter(x => !NT_FILL_PRE_BASE.includes(x));
const NT_FILL_NEG_POOL_POST  = NT_FILL_NEG_POOL_ALL .filter(x => !NT_FILL_PRE_NEG .includes(x));

const usedPairKeysPost = new Set();
const NT_FILL_POST_BASE = takeDistinctByKey(NT_FILL_BASE_POOL_POST, 4, usedPairKeysPost);
const NT_FILL_POST_NEG  = takeDistinctByKey(NT_FILL_NEG_POOL_POST , 4, usedPairKeysPost);
const NT_FILL_POST      = NT_FILL_POST_BASE.concat(NT_FILL_POST_NEG);


// 7) build NT lists (12 each) with no adjacent criticals
function buildNTList(critArr, fillArr){
  const pattern = ['F','C','F','F','C','F','F','C','F','F','C','F']; 
  const C = shuffle(critArr.slice());   // 4
  const F = shuffle(fillArr.slice());   // 8
  const out = [];
  let ci = 0, fi = 0;
  for (const p of pattern){
    out.push(p === 'C' ? C[ci++] : F[fi++]);
  }
  return out;
}

const nt_pre  = buildNTList(NT_CRIT_PRE,  NT_FILL_PRE);
const nt_post = buildNTList(NT_CRIT_POST, NT_FILL_POST);

// Only allow NT items (to prevent acceptability sentences from mixing in)
const isNTItem = s => {
  const t = norm(s && s.item_type);
  return t === "negation_test" || t === "filler_negation_test";
};
const nt_pre_final  = nt_pre .filter(isNTItem);
const nt_post_final = nt_post.filter(isNTItem);



//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////This section contain all the types of slides that will be used by the html file (e.g. practice slides, feedback slides, critial trial slides, demographic info slides, thank-you slide, etc.).////////
////////You can just modify the templates based on the need of your experiment. The most important thing is to update the "log_responses" functions, so that you log all the information you need.    ////////  
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function make_slides(f) {
  var slides = {};  
  slides.i0 = slide({
     name : "i0",
     start: function() {
      exp.startT = Date.now();
     }
  });

  slides.consent = slide({
    name: "consent",
    button: function() {
      exp.go(); // proceed to next slide
    }
  });

  slides.instructions = slide({
    name : "instructions",
    button : function() {
      exp.go(); //use exp.go() if and only if there is no "present" data.
    }
  });

  slides.single_trial = slide({
    name: "single_trial",
    start: function() {
      $(".err").hide();
      $(".display_condition").html("You are in " + exp.condition + ".");
    },
    button : function() {
      response = $("#text_response").val();
      if (response.length == 0) {
        $(".err").show();
      } else {
        exp.data_trials.push({
          "trial_type" : "single_trial",
          "response" : response
        });
        exp.go(); //make sure this is at the *end*, after you log your data
      }
    },
  });

  slides.practice_slider = slide({
    name : "practice_slider",

    /* trial information for this block
     (the variable 'stim' will change between each of these values,
      and for each of these, present_handle will be run.) */
    present : [{"a": 1}],
    //this gets run only at the beginning of the block
    present_handle : function(stim) {
      $(".err").hide();
      $(".errgood").hide();
      this.stim = stim;
      $(".prompt").html("Who did the chef cook dinner for?");
      this.init_sliders();
      exp.sliderPost = null; //erase current slider value
      exp.first_response_wrong = 0;
      exp.first_response_value = null;
      exp.attempts = 0;
    },
    button : function() {
      if (exp.sliderPost == null) {
        $(".err").show();
      } 
      else if (exp.sliderPost < 0.5) {
        exp.first_response_wrong = 1;
        exp.first_response_value =exp.sliderPost;
        exp.attempts = exp.attempts + 1;
        $(".errgood").show();
      }
      else {
        this.log_responses();
        /* use _stream.apply(this); if and only if there is
        "present" data. (and only *after* responses are logged) */
        _stream.apply(this);
      }
    },
    init_sliders : function() {
      utils.make_slider("#practice_slider_1", function(event, ui) {
        exp.sliderPost = ui.value;
      });
    },
    log_responses : function() {
      exp.data_trials.push({
        "response" : exp.sliderPost,
        "first_response_value": exp.first_response_value,
        "wrong_attempts": exp.attempts,
        "item_type" : "practice_good",
        "item_number": "practice_good",
        "trial_sequence_total": 0
      });

    }
  });


  slides.post_practice_1 = slide({
    name : "post_practice_1",
    button : function() {
      exp.go(); //use exp.go() if and only if there is no "present" data.
    }
  });


  slides.practice_slider_bad = slide({
    name : "practice_slider_bad",

    /* trial information for this block
     (the variable 'stim' will change between each of these values,
      and for each of these, present_handle will be run.) */
    present : [1],

  
    //this gets run only at the beginning of the block
    present_handle : function(stim) {
      $(".err").hide();
      $(".errbad").hide();
      $(".prompt").html("Who the chef for cook dinner did?");
      this.init_sliders();
      exp.sliderPost = null; //erase current slider value
      exp.first_response_wrong = 0;
      exp.first_response_value = null;
      exp.attempts = 0;
    },

    button : function() {
      if (exp.sliderPost == null) {
        $(".err").show();
      } 
      else if (exp.sliderPost > 0.5) {
        exp.first_response_wrong = 1;
        exp.first_response_value = exp.sliderPost;
        exp.attempts = exp.attempts + 1;
        $(".errbad").show();
      }
      else {
        this.log_responses();
        /* use _stream.apply(this); if and only if there is
        "present" data. (and only *after* responses are logged) */
        _stream.apply(this);
      }
    },
    init_sliders : function() {
      utils.make_slider("#practice_slider_2", function(event, ui) {
        exp.sliderPost = ui.value;
        
      });
    },
    log_responses : function() {
      exp.data_trials.push({
        "response" : exp.sliderPost,
        "first_response_value": exp.first_response_value,
        "wrong_attempts": exp.attempts,
        "item_type" : "practice_bad",
        "item_number": "practice_bad",
        "trial_sequence_total": 0
      });

    }
  });

  slides.post_practice_2 = slide({
    name : "post_practice_2",
    button : function() {
      exp.go(); //use exp.go() if and only if there is no "present" data.
    }
  });

    // Negation practice: two-phase (read -> slider), using the same slider logic as acceptability
  slides.negation_practice = slide({
    name: "negation_practice",

    // Only one practice item
    present: [
      {
        sentence: "John didn’t buy anything at the festival yesterday.",
        question: "Was there a festival yesterday?"
      }
    ],

    // First show instruction + sentence only
    present_handle: function(stim) {
      $(".err").hide();
      this.stim  = stim;
      this.phase = "read";  // first click: from read page to slider page

      $(".neg_instruction").show();
      $("#neg_prac_sentence").html("<b>" + stim.sentence + "</b>");
      $("#neg_prac_q_block").hide();
      $("#neg_prac_question").html("<b>" + stim.question + "</b>");

      // Initialize practice negation slider (same logic as acceptability).
      // Do NOT preset any default value; exp.sliderPost stays null until participant moves it.
      this.init_sliders();
      exp.sliderPost = null;
    },

    button: function() {

      // ---------- First click: go from sentence (read) page to question + slider page ----------
      if (this.phase === "read") {
        this.phase = "slider";

        // Hide instruction and sentence, show only question + slider
        $(".neg_instruction").hide();
        $("#neg_prac_sentence").text("");
        $("#neg_prac_q_block").show();
        $(".err").hide();

        return; // stay on this slide, now in the slider phase
      }

      // ---------- Second click: slider page, submit response ----------
      if (exp.sliderPost == null) {
        $(".err").show();
        return;
      }

      const val = exp.sliderPost;

      exp.data_trials.push({
        trial_type: "negation_practice",
        sentence  : this.stim.sentence,
        question  : this.stim.question,
        response  : val
      });

      console.log("[DATA] NT_PRACTICE", exp.data_trials[exp.data_trials.length - 1]);

      _stream.apply(this); // go to next slide (last_reminder)
    },

    init_sliders: function() {
      utils.make_slider("#nt_prac_slider", function(event, ui) {
        // Same as acceptability: no preset; value only exists after participant moves the handle
        exp.sliderPost = ui.value;
      });
    }
  });


  slides.last_reminder = slide({
    name : "last_reminder",
    button : function() {
      exp.go(); //use exp.go() if and only if there is no "present" data.
    }
      
  });


  slides.one_slider = slide({
    name : "one_slider",
    present : main_order,
    present_handle : function(stim) {
      $(".err").hide();
      this.stim = stim;
      $(".target").html(stim.sentence);
      this.init_sliders();
      exp.sliderPost = null;

      update_progress();
    },
    button : function() {
      if (exp.sliderPost == null) {
        $(".err").show();
      } else {
        this.log_responses();
        exp.trial_index++;
        _stream.apply(this);
      }
    },
    init_sliders : function() {
      utils.make_slider("#single_slider", function(event, ui) {
        exp.sliderPost = ui.value;
      });
    },
    log_responses : function() {
      exp.data_trials.push({
        trial_type       : "acceptability",
        order            : order++,                     
        response         : exp.sliderPost,
        lexicalization   : this.stim.lexicalization || null,
        sentence         : this.stim.sentence,
        structure        : this.stim.structure || null,
        dependency_length: this.stim.dependency_length || null,
        item_type        : this.stim.item_type,
        sentence_id      : this.stim.unique_id
      });

      console.log("[DATA] MAIN", exp.data_trials[exp.data_trials.length - 1]);
    }

  });

///////////////////////////////
// Negation helper function //
//////////////////////////////

function splitNegSentence(stim) {
  const full = String(stim.sentence).trim();

  // Split on the last "?" to separate statement+question and anything after
  const qIdx = full.lastIndexOf("?");
  const beforeQ = qIdx >= 0 ? full.slice(0, qIdx + 1).trim() : full;

  // Find the first period to cut statement vs. question
  const dotIdx = beforeQ.indexOf(".");
  let sentence = beforeQ;
  let question = "";

  if (dotIdx >= 0 && dotIdx < beforeQ.length - 1) {
    sentence = beforeQ.slice(0, dotIdx + 1).trim();   // first sentence with period
    question = beforeQ.slice(dotIdx + 1).trim();      // remaining text as question
  }

  return { sentence, question };
}

slides.negation_test_pre = slide({
  name: "negation_test_pre",
  present: nt_pre_final,      // 12 NT items

  present_handle: function(stim) {
    console.log("Beginning negation_test_pre item", stim.unique_id);
    $(".err").hide();

    exp.current_phase = "pre";
    this.stim  = stim;
    this.phase = "read";   // first click: read -> slider

    const parts = splitNegSentence(stim);

    // 1st page: show instruction + sentence only
    $(".neg_instruction").show();
    $("#neg_pre_sentence").html("<b>" + parts.sentence + "</b>");
    $("#neg_pre_q_block").hide();
    $("#neg_pre_question").text("");   // clear question on read page

    // Initialize pre negation slider
    this.init_sliders_pre();
    exp.sliderPost = null;

    // update progress for the read page
    exp.trial_index++;
    if (typeof update_progress === "function") {
      update_progress();
    }

    console.log("[PAGE] NT_PRE read", {
      id: stim.unique_id,
      sentence: parts.sentence
    });
  },

  button: function() {

    // ---------- First click: from READ → SLIDER ----------
    if (this.phase === "read") {
      const isFiller = (this.stim.item_type === "filler_negation_test");
      const parts    = splitNegSentence(this.stim);

      // log the read page
      const trial_read = {
        trial_type : "negation_pre_read",
        order      : order++,
        is_filler  : isFiller ? 1 : 0,
        polarity   : this.stim.polarity || null,
        response   : null,
        sentence   : parts.sentence,
        sentence_id: this.stim.unique_id
      };

      exp.data_trials.push(trial_read);
      console.log("[DATA] NT_PRE_READ", trial_read);

      // go to slider page: hide instruction, hide sentence, show question + slider
      this.phase = "slider";

      $(".neg_instruction").hide();
      $("#neg_pre_sentence").text("");
      $("#neg_pre_question").html("<b>" + parts.question + "</b>");
      $("#neg_pre_q_block").show();

      $(".err").hide();

      // progress for slider page
      exp.trial_index++;
      if (typeof update_progress === "function") {
        update_progress();
      }

      console.log("[PAGE] NT_PRE slider", {
        id: this.stim.unique_id,
        question: parts.question
      });

      return;  // stay in this slide, now waiting for slider response
    }

    // ---------- Second click: SLIDER phase ----------
    if (exp.sliderPost == null) {
      $(".err").show();
      return;
    }

    const val = exp.sliderPost;

    const isFiller = (this.stim.item_type === "filler_negation_test");
    const parts2   = splitNegSentence(this.stim);

    const trial_obj = {
      trial_type : "negation_pre",
      order      : order++,
      is_filler  : isFiller ? 1 : 0,
      polarity   : this.stim.polarity || null,
      response   : val,
      sentence   : parts2.sentence,
      question   : parts2.question,
      sentence_id: this.stim.unique_id
    };

    exp.data_trials.push(trial_obj);
    console.log("[DATA] NT_PRE", trial_obj);

    _stream.apply(this);  // go to the next stimulus
  }
    ,
  init_sliders_pre: function() {
    utils.make_slider("#nt_slider", function(event, ui) {
      exp.sliderPost = ui.value;
    });
  }
});


slides.negation_test_post = slide({
  name: "negation_test_post",
  present: nt_post_final,      // 12 NT items (4 critical + 8 fillers)

  present_handle: function(stim) {
    console.log("Beginning negation_test_post item", stim.unique_id);
    $(".err").hide();

    exp.current_phase = "post";
    this.stim  = stim;
    this.phase = "read";   // first click: read -> slider

    const parts = splitNegSentence(stim);

    // Page 1: show instruction + statement only
    $(".neg_instruction").show();
    $("#neg_post_sentence").html("<b>" + parts.sentence + "</b>");
    $("#neg_post_q_block").hide();
    $("#neg_post_question").text("");   // clear question on read page

    // Initialize post negation slider
    this.init_sliders_post();
    exp.sliderPost = null;

    // Update progress for the read page
    exp.trial_index++;
    if (typeof update_progress === "function") {
      update_progress();
    }

    console.log("[PAGE] NT_POST read", {
      id: stim.unique_id,
      sentence: parts.sentence
    });
  },

  button: function() {

    // ---------- First click: from READ → SLIDER ----------
    if (this.phase === "read") {
      const isFiller = (this.stim.item_type === "filler_negation_test");
      const parts    = splitNegSentence(this.stim);

      // Log the read page
      const trial_read = {
        trial_type : "negation_post_read",
        order      : order++,
        is_filler  : isFiller ? 1 : 0,
        polarity   : this.stim.polarity || null,
        response   : null,                 // no response on read page
        sentence   : parts.sentence,
        sentence_id: this.stim.unique_id
      };

      exp.data_trials.push(trial_read);
      console.log("[DATA] NT_POST_READ", trial_read);

      // Switch to slider page: hide instruction and sentence, show question + slider
      this.phase = "slider";

      $(".neg_instruction").hide();
      $("#neg_post_sentence").text("");
      $("#neg_post_question").html("<b>" + parts.question + "</b>");
      $("#neg_post_q_block").show();

      $(".err").hide();

      // Update progress for the slider page
      exp.trial_index++;
      if (typeof update_progress === "function") {
        update_progress();
      }

      console.log("[PAGE] NT_POST slider", {
        id: this.stim.unique_id,
        question: parts.question
      });

      return;  // stay on this slide, now in slider phase
    }

    // ---------- Second click: SLIDER phase ----------
    if (exp.sliderPost == null) {
      $(".err").show();
      return;
    }

    const val = exp.sliderPost;

    const isFiller = (this.stim.item_type === "filler_negation_test");
    const parts2   = splitNegSentence(this.stim);

    const trial_obj = {
      trial_type : "negation_post",
      order      : order++,
      is_filler  : isFiller ? 1 : 0,
      polarity   : this.stim.polarity || null,
      response   : val,
      sentence   : parts2.sentence,
      question   : parts2.question,
      sentence_id: this.stim.unique_id
    };

    exp.data_trials.push(trial_obj);
    console.log("[DATA] NT_POST", trial_obj);

    _stream.apply(this);  // go to the next stimulus
  }
    ,
  init_sliders_post: function() {
    utils.make_slider("#nt_slider_post", function(event, ui) {
      exp.sliderPost = ui.value;
    });
  }
});
  

  slides.subj_info =  slide({
    name : "subj_info",
    submit : function(e){
      //if (e.preventDefault) e.preventDefault(); // I don't know what this means.
      exp.subj_data = {
        asses : $('input[name="assess"]:checked').val(),
        age : $("#age").val(),
        gender : $("#gender").val(),
        education : $("#education").val(),
        comments : $("#comments").val(),
        fairprice: $("#fairprice").val()
      };
      exp.go(); //use exp.go() if and only if there is no "present" data.
    }
  });

  slides.thanks = slide({
    name : "thanks",
    start : function() {
      exp.data= {
          "trials" : exp.data_trials,
          "catch_trials" : exp.catch_trials,
          "system" : exp.system,
          "subject_information" : exp.subj_data,
          "time_in_minutes" : (Date.now() - exp.startT)/60000
      };
      proliferate.submit(exp.data);
    }
  });

  return slides;
}

// progress bar //
function update_progress() {
  if (!exp.total_trials) return;
  var pct = (exp.trial_index / exp.total_trials) * 100;
  $(".progress .bar").css("width", pct + "%");
}


/// init ///
function init() {
  exp.trials = [];
  exp.catch_trials = [];
  //exp.condition = _.sample(["condition 1", "condition 2"]); //can randomize between subject conditions here
  exp.system = {
      Browser : BrowserDetect.browser,
      OS : BrowserDetect.OS,
      screenH: screen.height,
      screenUH: exp.height,
      screenW: screen.width,
      screenUW: exp.width
    };
  
  // total trials that use the progress bar:
  // pre-negation + acceptability + post-negation
  exp.total_trials = 
    2 * nt_pre_final.length +    // 2 pages pre NT item 
    main_order.length +          // 1 page per acceptability item
    2 * nt_post_final.length;    // 2 pages post NT item 

  exp.trial_index = 0; // number of COMPLETED trials so far
  
  //blocks of the experiment:
  exp.structure=[ "i0", "consent", "instructions", "practice_slider", "post_practice_1", "practice_slider_bad", "post_practice_2", "negation_practice", "last_reminder", 'negation_test_pre', 'one_slider', 'negation_test_post', 'subj_info', 'thanks'];

  exp.data_trials = [];
  //make corresponding slides:
  exp.slides = make_slides(exp);

  exp.nQs = utils.get_exp_length(); //this does not work if there are stacks of stims (but does work for an experiment with this structure)
                    //relies on structure and slides being defined

  $('.slide').hide(); //hide everything

  //make sure turkers have accepted HIT (or you're not in mturk)
  $("#start_button").click(function() {
    exp.go();
  });

  exp.go(); //show first slide
}
