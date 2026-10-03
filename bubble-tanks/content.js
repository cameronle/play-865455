(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else(root.BubbleFrontier||={}).Content=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const record=(id,zh,en,cz,ce,extra={})=>({id,name:[zh,en],description:[cz,ce],icon:id,...extra});
 const chassis=[
  record('balanced','均衡体','Balanced','对称泡泡结构，火力与机动均衡。','Symmetric bubbles. Flexible and dependable.',{speed:1,armor:1}),
  record('scout','游猎者','Scout','高速脆壳，初始诱饵分身；侧移引开火力。','Fast fragile scout; starts with Decoy to redirect fire.',{speed:1.16,armor:1.12}),
  record('bulwark','堡垒体','Bulwark','厚甲低速，初始屏障环；贴近敌人拦截弹幕。','Slow armored body; starts with Barrier for close defense.',{speed:.86,armor:.8}),
  record('gunship','火力体','Gunship','初始双联炮与两点额外功率，机体宽大低速。','Starts with Twin Burst and two extra power; broad and slower.',{speed:.92,armor:1.06,power:2}),
  record('swarmbody','蜂群体','Hivebody','初始蜂群集结，多一枚限时无人机围攻目标。','Starts with Swarm Rally and one extra temporary drone.',{speed:1,armor:1.05}),
  record('phase','相位体','Phase','初始短距跃迁，冲刺保护延长，外壳较脆。','Starts with Blink; extended dash protection, fragile shell.',{speed:1.08,armor:1.15})
 ];
 const gun=(id,zh,en,cz,ce,cost,cooldown,cap=3)=>record(id,zh,en,cz,ce,{type:'gun',cost,cooldown,cap});
 const guns=[
  gun('pulse','泡泡炮','Pulse Cannon','精准单发炮，可靠地打向准星。','Accurate single bubbles travel toward your aim.',1,.38,4),
  gun('twin','双联连发','Twin Burst','每轮分两拍发射，第二发延迟0.12秒。','Two timed shots per burst; the second follows after 0.12s.',2,.7),
  gun('scatter','扇形散射','Bubble Fan','五向散射，近距集中命中，可连接分裂接头。','Five spread shots reward close range and support splitting.',3,.85),
  gun('stream','速射喷流','Bubble Stream','持续小泡喷流；积热后必须短暂停火。','Rapid small bubbles build heat and require a cooling pause.',3,.12),
  gun('needle','狙击针泡','Needle','带瞄准前摇的高速重弹，射程较远。','A telegraphed high-speed heavy needle reaches distant targets.',4,1.8),
  gun('pierce','穿透长泡','Long Bubble','长泡贯穿最多三个不同目标，不重复伤害同一目标。','Elongated bubbles pierce up to three unique targets.',4,1.0),
  gun('missile','追踪泡泡荚','Seeker Pod','有限转向追踪泡，目标死亡后重新选择。','Limited-turn seekers reacquire when their target dies.',4,1.1),
  gun('beam','持续光束','Contact Beam','持续接触光束，每0.12秒结算一次伤害。','A contact beam applies damage on fixed 0.12s ticks.',5,.12),
  gun('arc','连锁电弧','Chain Arc','电弧最多跳跃三次，目标去重；体量Ⅱ后可用。','Arcs hit up to three unique nearby targets; needs body II.',6,1.3),
  gun('mine','布雷器','Bubble Mines','部署后0.4秒武装，接近触发；每炮口最多四颗。','Mines arm after 0.4s and trigger nearby; four per mount.',3,1.4),
  gun('orbit','轨道护卫泡','Orbit Guard','三枚限时护卫绕行，接触伤害并拦截敌弹。','Three temporary guards orbit, damage on contact and intercept.',4,2.8),
  gun('vortex','涡旋泡','Vortex Bubble','限时局部引力泡，牵引小敌并持续伤害；Boss抗牵引。','Temporary local gravity pulls small foes and deals bounded damage.',5,3.2)
 ];
 const skills=[
  record('overload','超载护盾','Overload Shield','瞬间补充护膜，冷却12秒。','Instant shield refill on a twelve-second cooldown.',{cooldown:12}),
  record('emp','震荡 EMP','Shock EMP','震荡附近敌人、消去敌弹；导电目标引发额外局部震荡。','Stun nearby foes and clear bullets; conductive foes discharge locally.',{cooldown:14}),
  record('blink','短距跃迁','Short Blink','朝瞄准方向跃迁140单位并获得短保护；不能跳过房间边界。','Blink 140 units with brief immunity, never bypassing room boundaries.',{cooldown:10}),
  record('barrier','屏障环','Barrier Ring','临时拦截环保留前方缺口；堡垒体扩大覆盖。','A temporary intercepting ring retains a front gap; Bulwark improves coverage.',{cooldown:16}),
  record('burst','泡泡爆发','Bubble Burst','近距击退与伤害，并消去有限数量敌弹。','A local damaging knockback clears a bounded number of bullets.',{cooldown:13}),
  record('decoy','诱饵分身','Bubble Decoy','生成3秒诱饵吸引瞄准，离开时可留下延时泡雷。','A three-second decoy draws enemy aim and can leave a delayed mine.',{cooldown:15}),
  record('overdrive','火力超载','Fire Overdrive','4秒提高开火频率，冷却18秒；虹吸仍有时间段上限。','Four seconds of faster fire; siphon remains rate-limited.',{cooldown:18}),
  record('swarm','蜂群集结','Swarm Rally','生成限时无人机围攻当前目标，数量和持续时间均有限。','Temporary drones rally on the current target with strict count and lifetime limits.',{cooldown:17})
 ].map(x=>({...x,type:'skill',cap:1,cost:0}));
 const ballistic=['pulse','twin','scatter','stream','needle','pierce','missile'];
 const passive=(id,zh,en,cz,ce,extra={})=>record(id,zh,en,cz,ce,{type:'passive',cap:3,cost:0,...extra});
 const passives=[
  passive('damage','炮芯强化','Cannon Core','提高武器直接伤害，不增加召唤或弹体数量。','Improve direct weapon damage without extra projectiles.'),
  passive('rapid','装填加速','Quick Chamber','缩短所有主武器发射间隔。','Reduce all primary weapon firing intervals.'),
  passive('pierce_amp','穿透增幅','Pierce Coupler','直射弹可额外贯穿不同目标，命中去重。','Direct shots pierce extra unique targets.',{needs:ballistic,cap:2}),
  passive('split','分裂接头','Split Coupler','散射命中分成两枚碎泡，只分裂一次。','Fan hits split into two fragments, with one generation only.',{needs:'scatter',cap:2}),
  passive('refract','折射表面','Refraction Film','直射弹在泡泡边界反弹一次，寿命不重置。','Direct bubbles reflect from the boundary without resetting lifetime.',{needs:ballistic,cap:2}),
  passive('focus','暴击聚焦','Burst Focus','双联连续三次有效命中强化下一轮；漏击重置。','Three consecutive twin hits strengthen the next burst; misses reset it.',{needs:'twin',cap:2}),
  passive('shell','缓冲外壳','Buffer Shell','进入护盾前降低伤害，机体质量仍会受损。','Reduce damage before shields absorb it; mass remains vulnerable.'),
  passive('shield','护盾再生','Shield Membrane','增加外沿护膜并缓慢恢复；不增加成长。','Add a slowly regenerating shield without growth credit.'),
  passive('protection','受伤保护','Recovery Window','受伤保护延长，但不提供永久无敌。','Extend the brief post-hit immunity, never permanent invulnerability.'),
  passive('conserve','质量保全','Mass Retainer','只降低穿过护盾后的质量损失。','Reduce only mass lost after shield absorption.'),
  passive('recycler','脱落回收','Shed Recycler','受伤后留下更多可回收质量，不增加成长或分数。','Retain more recoverable shed mass without growth or score.'),
  passive('emergency','紧急隔离','Emergency Membrane','每个房间一次，低质量时触发小护盾与短保护。','Once per room, low mass triggers a small shield and brief immunity.',{cap:2}),
  passive('thruster','推进器','Thruster','提高移动速度并缩短冲刺冷却。','Move faster and recover your dash sooner.'),
  passive('steering','转向稳定器','Aim Stabilizer','准星靠近可见敌人时轻微吸附，不替你跨房间瞄准。','Aim gently snaps toward nearby visible foes, never across rooms.'),
  passive('magnet','吸附器','Bubble Magnet','扩大战斗中的泡泡吸收范围。','Draw loose bubbles from farther away during combat.'),
  passive('sonar','广域声呐','Wide Sonar','显示邻接房间；狙击针泡对远处可见目标获得弱点窗口。','Reveal neighboring rooms and expose visible distant targets to needles.',{cap:2}),
  passive('cooling','冷却循环','Cooling Loop','主动技能和冲刺恢复更快，并加快喷流散热。','Recover skills and dash sooner and cool streams faster.'),
  passive('collector','清场采集器','Clear Collector','首次清场立即收集剩余泡泡，不复制奖励。','Immediately collect existing drops on clear, without duplicating rewards.',{cap:1}),
  passive('frost','寒性泡膜','Cold Membrane','有效命中使小敌暂时减速，Boss减速受限。','Valid hits briefly slow small foes; bosses resist the effect.',{cap:2}),
  passive('conductive','导电膜','Conductive Film','电弧延伸路径，命中留下可被EMP消耗的导电状态。','Extend arc paths and leave conductive charge that EMP can consume.',{needs:'arc',cap:2}),
  passive('mark','目标标记','Target Marker','命中标记目标，追踪泡优先追击；死亡立即解除。','Hits mark targets; seekers prefer marks and immediately release dead locks.',{needs:'missile',cap:2}),
  passive('siphon','有限虹吸','Bounded Siphon','直接有效伤害转回少量质量，恢复有每秒上限，不给成长。','Effective damage restores limited mass per second, never growth.',{cap:2}),
  passive('swarm_expand','蜂群扩展','Swarm Expansion','蜂群技能多派临时无人机，最多六枚。','Rally launches extra temporary drones, capped at six.',{needsSkill:'swarm',cap:2}),
  passive('converter','泡泡转化器','Bubble Converter','爆发消去的少量敌弹变成回收质量，无成长。','A bounded number of burst-cleared bullets become recoverable mass, no growth.',{needsSkill:'burst',cap:2})
 ];
 const relics=[
  record('glass_core','玻璃核心','Glass Core','伤害提高35%，但承受的质量伤害提高40%。','Gain 35% damage but suffer 40% more incoming mass damage.'),
  record('heavy_core','重泡核心','Heavy Core','受伤降低25%，移动速度降低17%。','Take 25% less damage but move 17% slower.'),
  record('hot_chamber','过热腔体','Hot Chamber','喷流随热量增伤，过热必须停火更久。','Stream damage grows with heat, but overheating causes a longer pause.',{needs:'stream'}),
  record('ice_crystal','冰晶膜','Ice Crystal','光束连续命中积累短冻结，开火间隔延长15%。','Beam contact builds brief freezing, at 15% longer firing intervals.',{needs:'beam'}),
  record('conductive_sea','导电海','Conductive Sea','电弧多一跳，但承受伤害增加15%。','Arcs gain one bounded jump, but incoming damage rises 15%.',{needs:'arc'}),
  record('fission_core','裂变核','Fission Core','直射泡命中单层分裂，弹体寿命缩短20%。','Direct bubbles split once on hit, but projectile lifetime drops 20%.',{needs:ballistic}),
  record('flow_core','环流核','Flow Core','轨道半径和持续时间增加，占用额外两点机体功率。','Expand orbit radius and duration at the cost of two body power.',{needs:'orbit'}),
  record('echo_shell','回声壳','Echo Shell','每三轮直射回声一次，但所有伤害降低12%。','Every third direct volley echoes, but all damage falls 12%.',{needs:ballistic}),
  record('active_hive','活性巢','Active Hive','蜂群持续更久，常规武器伤害降低20%。','Drones last longer while regular weapon damage falls 20%.',{needsSkill:'swarm'}),
  record('gravity_sac','引力囊','Gravity Sac','涡旋牵引增强50%，机体速度降低10%。','Vortex pull grows 50%, but body speed falls 10%.',{needs:'vortex'}),
  record('efficiency','节能腔','Economy Chamber','机体多两点功率，常规武器发射间隔延长15%。','Gain two body power at 15% longer primary firing intervals.'),
  record('turbulent_tail','湍流尾迹','Turbulent Tail','冲刺留下限时伤害尾迹，冲刺冷却增加1秒。','Dash leaves a temporary damaging wake but takes one extra second to recover.')
 ].map(x=>({...x,type:'relic',cap:1,cost:0}));
 const branchNames=[
  ['pulse','折返炮口','Return Muzzle','基础泡泡可以反弹一次。','Pulse bubbles reflect once.'],
  ['twin','三拍齐射','Triple Rhythm','双拍改成三拍，保留间隔而非瞬间复制。','Two timed shots become three distinct beats.'],
  ['scatter','碎泡散射','Fragment Fan','散射命中单层分裂，不递归。','Fan shots fragment on hit once, never recursively.'],
  ['stream','交替喷口','Alternating Jets','左右交替喷流，在散热间隙改变覆盖方向。','Alternating left and right jets change coverage between vents.'],
  ['needle','串针分支','Threading Needle','重针贯穿第二个目标。','The heavy needle continues through a second target.'],
  ['pierce','聚焦分支','Focused Lance','先蓄力再射出宽长泡，贯穿更多目标。','Charge first, then launch a wider bubble through more targets.'],
  ['missile','标记齐射','Marked Salvo','双荚分角发射，再逐步追踪同一标记。','Two angled pods gradually home on the same marked target.'],
  ['beam','扫射透镜','Sweep Lens','三束窄光轮换扫射，伤害总额不按帧数增加。','Three narrow beams sweep alternately on fixed damage ticks.'],
  ['arc','分叉导体','Forked Conductor','主电弧旁产生一次有限侧向跳跃。','The main chain emits one bounded side branch.'],
  ['mine','冷雾雷','Cold Mist Mine','爆炸后留下2秒减速区，数量受限。','A triggered mine leaves a bounded two-second slow field.'],
  ['orbit','偏心轨道','Eccentric Orbit','轨道半径周期变化，形成更大的接触覆盖。','Oscillating orbit radius expands contact coverage.'],
  ['vortex','脉冲涡旋','Pulse Vortex','引力泡消散时产生一次向外挤压，不永久控场。','A dying gravity bubble pulses outward once, never permanent control.']
 ];
 const branches=branchNames.map(([gun,zh,en,cz,ce])=>record(gun+'_branch',zh,en,cz,ce,{type:'branch',gun,needs:gun,cap:1,cost:0,icon:gun}));
 const synergies=[
  ['fan_split','散射 × 分裂','Fan × Split',['gun:scatter','passive:split'],'单层碎泡，不允许递归。','One fragment generation; recursion is forbidden.'],
  ['focused_lance','贯通蓄力','Focused Lance',['gun:pierce','branch:pierce'],'蓄力前摇后宽泡贯通更多目标。','A charged wide bubble pierces more targets.'],
  ['conductive_chain','导电连锁','Conductive Chain',['gun:arc','passive:conductive'],'导电目标延长有限跳跃路径。','Charged targets extend a bounded chain path.'],
  ['guard_refill','轨道回充','Guard Refill',['gun:orbit','passive:shield'],'成功拦截回充少量护盾，每0.5秒至多一次。','Successful intercepts refill limited shield, once per 0.5s.'],
  ['gravity_mines','引力雷区','Gravity Mines',['gun:vortex','gun:mine'],'把小敌牵向布雷区，Boss牵引受限。','Pull small foes toward mines; bosses resist control.'],
  ['marked_salvo','标记追击','Marked Salvo',['gun:missile','passive:mark'],'追踪优先标记，死亡后立即解除。','Seekers prefer marks and release dead targets.'],
  ['crystal_beam','冰晶扫射','Crystal Beam',['gun:beam','relic:ice_crystal'],'接触累计短冻结，设定冻结免疫间隙。','Contact builds brief freezing with a mandatory immunity window.'],
  ['overdrive_siphon','超载虹吸','Overdrive Siphon',['skill:overdrive','passive:siphon'],'超载期间虹吸额度提高，仍按秒限量。','Overdrive raises the per-second siphon cap without removing it.'],
  ['rally_swarm','蜂群集中','Rally Swarm',['skill:swarm','passive:swarm_expand'],'有限无人机集中攻击可见目标。','Bounded temporary drones concentrate on a visible target.'],
  ['decoy_mine','诱饵伏雷','Decoy Mine',['skill:decoy','gun:mine'],'诱饵消失留下一颗延时雷。','An expiring decoy leaves one delayed mine.'],
  ['emp_charge','EMP 放电','EMP Discharge',['skill:emp','passive:conductive'],'消耗导电状态触发一次局部震荡。','Consume conductive state for one local shock.'],
  ['blink_orbit','跃迁残影','Blink Orbit',['skill:blink','gun:orbit'],'短暂轨道残影按时消失。','A temporary orbital afterimage expires on schedule.'],
  ['fortress_ring','堡垒屏障','Fortress Ring',['chassis:bulwark','skill:barrier'],'强化外沿覆盖，仍保留方向缺口。','Reinforce coverage while retaining a directional gap.'],
  ['focused_burst','连续聚焦','Focused Burst',['gun:twin','passive:focus'],'连续命中强化下一轮，漏击重置。','Consecutive hits strengthen the next volley; misses reset.'],
  ['hot_stream','热流喷口','Hot Stream',['gun:stream','relic:hot_chamber'],'热量提高输出，过热后强制停火。','Heat improves output but forces a cooling pause.'],
  ['sonar_needle','声呐弱点','Sonar Needle',['gun:needle','passive:sonar'],'本房间远处可见目标暴露弱点。','Expose distant visible targets in the current room only.'],
  ['gravity_fan','聚泡散射','Gravity Fan',['gun:vortex','gun:scatter'],'限时聚敌提高散射覆盖，不能无限锁场。','Temporary grouping improves fan coverage without permanent lock.'],
  ['burst_recycle','爆发回收','Burst Recycle',['skill:burst','passive:converter'],'少量敌弹变回收质量，不增加成长。','A few cleared bullets become mass without growth credit.']
 ].map(([id,zh,en,requires,cz,ce])=>record(id,zh,en,cz,ce,{requires}));
 const enemyRows=[
  ['chaser','追逐小泡','Chaser',0,14,'持续追击，近身造成接触伤害。','Pursue continuously and threaten contact damage.'],
  ['grazer','游走闪避体','Drifter',0,14,'沿弧游走，受瞄准时侧向闪避。','Wander in arcs and sidestep visible aim.'],
  ['shooter','定点连发塔','Burst Tower',0,18,'固定炮位，短预警后三拍连发。','A stationary turret fires a warned three-beat burst.'],
  ['sniper','狙击预警体','Sniper',0,18,'长瞄准线后射出高速针泡。','A long aim telegraph precedes a fast needle.'],
  ['scatterer','近距散射体','Fan Walker',0,20,'接近有效距离后发射扇形弹幕。','Approach effective range and launch a wide fan.'],
  ['spinner','旋转炮台','Spinner',0,23,'周期发射旋转环形弹幕。','Periodically launch rotating radial volleys.'],
  ['guardian','护盾护卫','Guard',1,24,'正面护膜降低伤害，背侧开放。','A front membrane reduces hits; its rear remains open.'],
  ['spawner','蜂群母体','Brood',1,27,'预警后派出有限小敌，母体击破即停止。','Warn, then spawn bounded minions until the mother dies.'],
  ['miner','布雷体','Mine Layer',1,20,'移动并留下延迟武装的危险泡雷。','Move and leave delayed-arming hostile mines.'],
  ['splitter','分裂体','Splitter',1,24,'击破后分为两个一次性、无奖励的小体。','Death creates two non-recursive, rewardless fragments.'],
  ['laser','光束体','Laser',1,20,'明确长前摇后发出短持续光束。','A clear long telegraph precedes a short contact beam.'],
  ['vortexer','涡旋体','Gravity Keeper',1,22,'生成限时引力区，范围有预警。','Create temporary, telegraphed gravity zones.'],
  ['bomber','自爆体','Detonator',2,18,'靠近后倒计时自爆，可在爆发前击破。','Approach and count down; destroy it before detonation.'],
  ['healer','修复支援体','Mender',2,19,'以可见连接恢复附近受损敌人。','Visible links restore damaged nearby allies.'],
  ['leecher','质量虹吸体','Leech',2,18,'贴近后有限频率抽取质量并恢复自身。','Drain mass at a bounded close-range rate and heal itself.'],
  ['lobber','抛射炮体','Lobber',2,25,'在预测落点预警后产生局部爆炸。','Warn at a predicted landing point, then burst locally.'],
  ['teleporter','跃迁体','Blinker',2,20,'标记落点后短距跃迁，落点避开玩家。','Mark a destination and blink clear of the player.'],
  ['reflector','反射盾体','Reflector',3,22,'前盾短周期反射直射泡，背部开放。','A cycling front shield reflects direct bubbles; its rear is open.'],
  ['breaker','破盾体','Shield Breaker',3,24,'特殊针泡优先消耗护盾，不提高质量伤害。','Special needles drain shields before ordinary mass damage.'],
  ['escort','护航编队核心','Escort Core',3,28,'生成两枚可击破护航泡，核心减伤依赖护航存活。','Two destructible escorts protect the central core.']
 ];
 const enemies=enemyRows.map(([id,zh,en,zone,r,cz,ce])=>record(id,zh,en,cz,ce,{zone,r}));
 const encounters=[
  {id:'pursuit',zone:0,name:['追逐夹击','Pursuit'],members:['chaser','shooter']},
  {id:'crossfire',zone:0,name:['交叉火力','Crossfire'],members:['shooter','sniper','grazer']},
  {id:'shield-line',zone:1,name:['护盾阵列','Shield line'],members:['guardian','shooter','scatterer']},
  {id:'split-screen',zone:1,name:['分裂封锁','Split screen'],members:['splitter','miner','shooter']},
  {id:'repair-line',zone:2,name:['修复阵列','Repair line'],members:['guardian','healer','shooter']},
  {id:'pressure',zone:2,name:['落点压制','Landing pressure'],members:['lobber','chaser','teleporter']},
  {id:'escort-wing',zone:3,name:['护航突击','Escort wing'],members:['escort','breaker','grazer']}
 ];
 const upgrades=[...guns,...passives,...skills,...relics,...branches];
 function text(value,lang='zh'){return Array.isArray(value)?value[lang==='en'?1:0]:value;}
 return{encounters,chassis,guns,skills,passives,relics,branches,synergies,enemies,upgrades,ballistic,text};
});
