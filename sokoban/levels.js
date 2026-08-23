(function(root,factory){const levels=factory();if(typeof module==='object'&&module.exports)module.exports=levels;if(root)root.SokobanLevels=levels;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
return [
  // Level 01: 1 box - Warmup line push
  ['#######','#  @$.#','#######'],
  // Level 02: 1 box - Simple detour around wall
  ['######','#   .#','# $ ##','# @  #','######'],
  // Level 03: 2 boxes - Simple dual push
  ['########','# .  . #','# $  $ #','#   @  #','#      #','########'],
  // Level 04: 2 boxes - Column alignment
  ['########','#  .   #','#  $   #','#  $ . #','#  @   #','#      #','########'],
  // Level 05: 2 boxes - Corner clearance
  ['######','#   .#','# $$ #','# .@ #','######'],
  // Level 06: 2 boxes - Side passage routing
  ['########','#   .. #','# @ $$ #','#      #','########'],
  // Level 07: 2 boxes - Central obstacle
  ['#######','#  .  #','# $#$ #','#  @  #','#  .  #','#######'],
  // Level 08: 2 boxes - Corridor bypass
  [' ######','#@   .#','# $#$ #','#    .#',' ######'],
  // Level 09: 2 boxes - Wide maneuver
  ['##########','# .    . #','# $ ## $ #','#   @    #','#        #','##########'],
  // Level 10: 3 boxes - Trio push
  ['#########','# . . . #','# $ $ $ #','#   @   #','#       #','#########'],
  // Level 11: 3 boxes - Central cross
  ['#######','#  @  #','# $#$ #','# .$. #','#  .  #','#######'],
  // Level 12: 3 boxes - Side chambers
  ['#######','# .   #','# $#$ #','# @ $ #','# ..  #','#######'],
  // Level 13: 3 boxes - Tight warehouse
  ['#######','#@  ..#','# $$$ #','#   . #','#######'],
  // Level 14: 3 boxes - Central column
  [' #######','##  .  #','#  $$$ #','# . # .#','#   @  #','########'],
  // Level 15: 3 boxes - L-turn room (Classic)
  ['  #####','###   #','# . $ #','# #$###','# .@  #','## $  #',' # .###',' #####'],
  // Level 16: 3 boxes - Asymmetric grid
  ['########','# .  . #','# $$   #','### # ##','#   #  #','# $  @ #','# .    #','########'],
  // Level 17: 4 boxes - Symmetry cross
  ['#########','#   .   #','#   $   #','# .$@$. #','#   $   #','#   .   #','#########'],
  // Level 18: 4 boxes - Four corners
  ['#########','# .   . #','# $ # $ #','#   @   #','# $ # $ #','# .   . #','#########'],
  // Level 19: 4 boxes - Multi-chamber
  [' ####','##  ####','#     .#','#.$#$  #','#  @$$.#','#  #  .#','########'],
  // Level 20: 4 boxes - Master warehouse
  ['########','#  . . #','# #$#$ #','# $   .#','## # ###','#  $ @ #','# .    #','########']
];
});
