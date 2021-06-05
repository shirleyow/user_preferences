$(function() {
    var availableTutorials  =  [
       "ActionScript",
       "Bootstrap",
       "C",
       "C++",
    ];
    $( "#search_new" ).autocomplete({
       source: availableTutorials
    });
 });