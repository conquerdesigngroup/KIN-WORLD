<script>
/* Intro: a rush of bubbles for 2.5 s with bubble sounds, then the sea fades into the invite.
   Browsers only allow sound after a tap, so the sound starts right away where allowed, otherwise on the first touch. */
(function(){
  var root=document.documentElement,intro=document.getElementById('intro');if(!intro)return;
  root.classList.add('gated');
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches,DUR=2500,t0=performance.now(),AC,played=false;
  function R(a,b){return a+Math.random()*(b-a)}
  function blip(t,f0,vol){var o=AC.createOscillator(),g=AC.createGain();o.type='sine';
    o.frequency.setValueAtTime(f0,t);o.frequency.exponentialRampToValueAtTime(f0*R(2.2,3.4),t+.09);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.012);g.gain.exponentialRampToValueAtTime(.0008,t+.13);
    o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+.15);}
  function sound(len){if(played||len<.25)return;played=true;
    var t=AC.currentTime+.02,n=Math.round(len*20),i;
    for(i=0;i<n;i++)blip(t+Math.pow(Math.random(),.8)*len,R(260,900),R(.05,.13));
    // soft underwater rumble under the pops
    var b=AC.createBuffer(1,Math.ceil(AC.sampleRate*len),AC.sampleRate),d=b.getChannelData(0);for(i=0;i<d.length;i++)d[i]=Math.random()*2-1;
    var s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=b;f.type='lowpass';f.frequency.value=420;
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.09,t+.2);g.gain.linearRampToValueAtTime(0,t+len);
    s.connect(f);f.connect(g);g.connect(AC.destination);s.start(t);}
  function left(){return Math.max(0,(DUR+300-(performance.now()-t0))/1000)}
  function trySound(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    if(AC.state==='running')sound(left());else AC.resume().then(function(){sound(left())}).catch(function(){});}catch(e){}}
  function tap(){trySound();}
  ['pointerdown','touchstart','keydown'].forEach(function(ev){document.addEventListener(ev,tap,{passive:true})});
  function done(){['pointerdown','touchstart','keydown'].forEach(function(ev){document.removeEventListener(ev,tap)});}
  function reveal(){intro.classList.add('go','out');root.classList.remove('gated');scrollTo(0,0);
    setTimeout(function(){intro.remove();done();},800);}
  if(reduce){reveal();return;}
  var W=innerWidth,n=Math.round(Math.min(110,60+W/14)),h='',i;
  for(i=0;i<n;i++){var big=Math.random()<.16,s=big?R(70,150):R(12,54);
    h+='<i class="ib" style="--x:'+R(-6,100).toFixed(1)+'%;--s:'+s.toFixed(0)+'px;--t:'+R(1.05,1.75).toFixed(2)+'s;--d:'+R(-.7,1.1).toFixed(2)+'s;--w:'+R(-26,26).toFixed(0)+'px"></i>';}
  intro.insertAdjacentHTML('beforeend',h);
  trySound();
  setTimeout(reveal,DUR-700);
})();
</script>
