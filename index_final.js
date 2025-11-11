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

// 6) NT fillers by item_type + polarity
const norm = v => String(v || "").trim().toLowerCase();

// All NT fillers, divided by polarity
const NT_FILL_BASE_POOL_ALL = shuffle(
  ALL.filter(x => norm(x.item_type) === "filler_negation_test" && norm(x.polarity) === "base")
);
const NT_FILL_NEG_POOL_ALL  = shuffle(
  ALL.filter(x => norm(x.item_type) === "filler_negation_test" &&
                  (norm(x.polarity) === "negated" || norm(x.polarity) === "negation"))
);

// pre: 4 base + 4 negated (without replacement)
const NT_FILL_PRE_BASE = NT_FILL_BASE_POOL_ALL.slice(0, 4);
const NT_FILL_PRE_NEG  = NT_FILL_NEG_POOL_ALL .slice(0, 4);
const NT_FILL_PRE      = NT_FILL_PRE_BASE.concat(NT_FILL_PRE_NEG);

// post: take 4 base + 4 negated from the remaining pools (without replacement, no overlap)
const usedPreIDs = new Set(NT_FILL_PRE.map(s => s.unique_id));
const NT_FILL_BASE_POOL_POST = NT_FILL_BASE_POOL_ALL.filter(s => !usedPreIDs.has(s.unique_id));
const NT_FILL_NEG_POOL_POST  = NT_FILL_NEG_POOL_ALL .filter(s => !usedPreIDs.has(s.unique_id));

const NT_FILL_POST = NT_FILL_BASE_POOL_POST.slice(0, 4).concat(
                      NT_FILL_NEG_POOL_POST .slice(0, 4)
                    );

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
      $(".prompt").html("Who did the cheif cook dinner for?");
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
      $(".prompt").html("Who the chief for cook dinner did?");
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

    slides.negation_practice = slide({
    name: "negation_practice",

    // only one practice item
    present: [
      {
        sentence: "John didn’t buy anything at the festival yesterday.",
        question: "Was there a festival yesterday?"
      }
    ],

    present_handle: function(stim) {
      $(".err").hide();
      this.stim = stim;

      $(".nt_sentence").html(stim.sentence);
      $(".nt_question").html(stim.question);

      $('input[name="nt_practice_response"]').prop('checked', false);
    },

    // only familiarize the participants with choosing an answer, no judgement on right or wrong.
    button: function() {
      const resp = $('input[name="nt_practice_response"]:checked').val();

      if (!resp) {
        $(".err").show();
      } else {
        exp.data_trials.push({
          trial_type: "negation_practice",
          sentence: this.stim.sentence,
          question: this.stim.question,
          response: resp
        });

        _stream.apply(this);  // go to the next slide
      }
    }
  });


  slides.last_reminder = slide({
    name : "last_reminder",
    button : function() {
      exp.go(); //use exp.go() if and only if there is no "present" data.
    }
    
  });

 slides.negation_test_pre = slide({
  name: "negation_test_pre",
  present: nt_pre_final,
  present_handle: function(stim){
    $(".err").hide();
    this.stim = stim;

   const txt = String(stim.sentence).trim();
    const dotIdx = txt.lastIndexOf(".");
    let statement = txt, question = "";
    if (dotIdx >= 0 && dotIdx < txt.length - 1) {
    statement = txt.slice(0, dotIdx + 1).trim();   // take everything up to and including the period
    question  = txt.slice(dotIdx + 1).trim();      // take the text after the period
     }

    $("#negation_test_pre #negation_sentence").text(statement);
    $("#negation_test_pre #negation_question").text(question);
    $('input[name="nt_response"]').prop('checked', false);

    // update bar based on how many trials have been completed so far
    update_progress();
  },
  button: function(){
    const resp = $('input[name="nt_response"]:checked').val();
    if (!resp){ $(".err").show(); return; }
    exp.data_trials.push({
      trial_type: "negation_pre",
      response  : resp,                         // "Yes" / "No" / "Unsure"
      polarity  : this.stim.polarity || null,   // "base"/"negated"
      sentence  : this.stim.sentence,           
      sentence_id: this.stim.unique_id,
    });

    exp.trial_index++;      // one more trial completed
    _stream.apply(this);
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
      trial_type : "acceptability",
      response : exp.sliderPost,
      lexicalization: this.stim.lexicalization || null,
      sentence: this.stim.sentence,
      structure: this.stim.structure || null,
      dependency_length: this.stim.dependency_length || null,
      item_type: this.stim.item_type,
      sentence_id: this.stim.unique_id
    });
  }
});


slides.negation_test_post = slide({
  name: "negation_test_post",
  present: nt_post_final,
  present_handle: function(stim){
    $(".err").hide();
    this.stim = stim;

    const txt = String(stim.sentence).trim();
    const dotIdx = txt.lastIndexOf(".");
    let statement = txt, question = "";
    if (dotIdx >= 0 && dotIdx < txt.length - 1) {
    statement = txt.slice(0, dotIdx + 1).trim();   // take everything up to and including the period
    question  = txt.slice(dotIdx + 1).trim();      // take the text after the period
    }

    $("#negation_test_post #negation_sentence").text(statement);
    $("#negation_test_post #negation_question").text(question);
    $('input[name="nt_response"]').prop('checked', false);

    update_progress();
  },
  button: function(){
    const resp = $('input[name="nt_response"]:checked').val();
    if (!resp){ $(".err").show(); return; }
    exp.data_trials.push({
      trial_type: "negation_post",
      response  : resp,
      polarity  : this.stim.polarity || null,
      sentence  : this.stim.sentence,
      sentence_id: this.stim.unique_id,
    });

    exp.trial_index++;
    _stream.apply(this);
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

// progress //
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
  exp.total_trials = nt_pre_final.length + main_order.length + nt_post_final.length; // 12+48+12=72
  exp.trial_index = 0; // number of COMPLETED trials so far
  
  //blocks of the experiment:
  exp.structure=["i0", "consent", "instructions", "practice_slider", "post_practice_1", "practice_slider_bad", "post_practice_2", "negation_practice", "last_reminder", 'negation_test_pre', 'one_slider', 'negation_test_post', 'subj_info', 'thanks'];

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
