(function(root,factory){const levels=factory();if(typeof module==='object'&&module.exports)module.exports=levels;if(root)root.SokobanLevels=levels;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
return [
  // Level 01: two-crate entry challenge
  ["####", "# .#", "#  ###", "#*@  #", "#  $ #", "#  ###", "####"],
  // Level 02: three-crate order planning
  ["#######", "#. #  #", "#  $  #", "#. $#@#", "#  $  #", "#. #  #", "#######"],
  // Level 03: three-crate central routing
  ["#######", "#     #", "#@$$$ ##", "#  #...#", "##    ##", " ######"],
  // Level 04: two-crate split corridor
  ["  ####", "###  ####", "#     $ #", "# #  #$ #", "# . .#@ #", "#########"],
  // Level 05: three-crate vertical delivery
  ["   ####", "   #  #", "   #@ #", "####$.#", "#   $.#", "# # $.#", "#    ##", "######"],
  // Level 06: two-crate chamber exit
  ["  ######", "  #    #", "  # ##@##", "### # $ #", "# ..# $ #", "#       #", "#  ######", "####"],
  // Level 07: two-crate long return route
  ["  ####", "###  #####", "#  $  @..#", "# $    # #", "### #### #", "  #      #", "  ########"],
  // Level 08: three-crate one-way warehouse
  ["      #####", "      #.  #", "      #.# #", "#######.# #", "# @ $ $ $ #", "# # # # ###", "#       #", "#########"],
  // Level 09: three-crate offset chambers
  ["####", "#. ##", "#.@ #", "#. $#", "##$ ###", " # $  #", " #    #", " #  ###", " ####"],
  // Level 10: three-crate multi-branch route
  ["     ####", "     # @#", "     #  #", "###### .#", "#   $  .#", "#  $$# .#", "#    ####", "###  #", "  ####"],
  // Level 11: two-crate double-turn corridor
  ["  #######", "###     #", "# $ $   #", "# ### #####", "# @ . .   #", "#   ###   #", "##### #####"],
  // Level 12: three-crate cross-room routing
  ["      ###", "##### #.#", "#   ###.#", "#   $ #.#", "# $  $  #", "#####@# #", "    #   #", "    #####"],
  // Level 13: two-crate narrow loop
  ["#####", "#   ####", "# # # .#", "#    $ ###", "### #$.  #", "#   #@   #", "# # ######", "#   #", "#####"],
  // Level 14: two-crate locked-room sequence
  ["########", "# @ #  #", "#      #", "#####$ #", "    #  ###", " ## #$ ..#", " ## #  ###", "    ####"],
  // Level 15: four-crate warehouse allocation
  ["      ######", "      #    #", "  ##### .  #", "###  ###.  #", "# $  $  . ##", "# @$$ # . #", "##    #####", " ######"],
  // Level 16: two-crate vertical shaft
  ["  ######", "  # ..@#", "  # $$ #", "  ## ###", "   # #", "   # #", "#### #", "#    ##", "# #   #", "#   # #", "###   #", "  #####"],
  // Level 17: four-crate asymmetric junction
  [" ####", " #  #######", " #$ @#   .#", "## #$$   .#", "#  $  ##..#", "#   # #####", "###   #", "  #####"],
  // Level 18: three-crate deep side chambers
  [" ####", " #  ####", " #     ##", "## ##   #", "#. .# @$##", "#   # $$ #", "#  .#    #", "##########"],
  // Level 19: four-crate long chamber allocation
  ["  ######", "  #    #", "  #  $ #", " ####$ #", "## $ $ #", "#....# ##", "#     @ #", "##  #   #", " ########"],
  // Level 20: four-crate master corridor
  [" #########", " #       #", "##@##### #", "#  #   # #", "#  #   $.#", "#  ##$##.#", "##$##  #.#", "#   $  #.#", "#   #  ###", "########"]
];
});
