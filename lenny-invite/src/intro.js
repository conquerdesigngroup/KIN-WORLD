<script>
/* Underwater intro. Six cut-paper reef layers are drawn in screen space, then scaled about a vanishing point
   as if a camera swims forward (scale = (P+d)/(P+d-z)), then the sea fades into the invite. */
(function(){
  var root=document.documentElement,intro=document.getElementById('intro'),reef=document.getElementById('reef'),btn=document.getElementById('openInvite');
  if(!intro||!reef||!btn)return;
  root.classList.add('gated');
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CARD=.2,P=620,DEP=[0,380,820,1330,1920,2600,3380,4270],DP=5000,FOG=[70,52,214],layers=[],W,H,ox,oy,seed,going=false,gone=false;
  function rnd(){seed=seed*16807%2147483647;return (seed-1)/2147483646}
  function R(a,b){return a+rnd()*(b-a)}
  function pick(a){return a[Math.floor(rnd()*a.length)]}
  function f(n){return n.toFixed(1)}
  function mix(hex,k){var n=parseInt(hex.slice(1),16),r=n>>16,g=n>>8&255,b=n&255;
    return 'rgb('+Math.round(r+(FOG[0]-r)*k)+','+Math.round(g+(FOG[1]-g)*k)+','+Math.round(b+(FOG[2]-b)*k)+')'}
  var PAL=['#ff5fa8','#ff9ec7','#ff8a6b','#ffd77a','#6ff0e4','#b9a6ff','#8cf5a8','#7fb8ff'];
  var DUNE=['#1c0f74','#5a1fb0','#2a3bd0','#7a2fc0','#3350e0','#6a2fc8','#3a48dc','#5a52e6'],NL=8;

  // ----- cut-paper corals: every piece gets a white sticker edge -----
  function branch(x,y,h,c,o,ow){var seg=[[],[],[]];
    (function go(x,y,a,len,lv){var x2=x+Math.sin(a)*len,y2=y-Math.cos(a)*len;
      seg[Math.min(lv,2)].push('M'+f(x)+' '+f(y)+'L'+f(x2)+' '+f(y2));
      if(lv<3&&len>h*.08){var n=lv?2:3;for(var i=0;i<n;i++)go(x2,y2,a+(i-(n-1)/2)*R(.55,.85)+R(-.15,.15),len*R(.56,.72),lv+1);}
    })(x,y+h*.05,R(-.1,.1),h*.37,0);
    var w=[h*.085,h*.06,h*.042],s='',i;
    for(i=0;i<3;i++)s+='<path d="'+seg[i].join('')+'" stroke="'+o+'" stroke-width="'+f(w[i]+ow*2)+'"/>';
    for(i=0;i<3;i++)s+='<path d="'+seg[i].join('')+'" stroke="'+c+'" stroke-width="'+f(w[i])+'"/>';
    return '<g fill="none" stroke-linecap="round">'+s+'</g>'}
  function fan(x,y,h,c,o,ow,c2){var n=8,cy=y-h*.2,r=h*.8,d='M'+f(x)+' '+f(cy),v='',i,a,pa;
    for(i=0;i<=n;i++){a=Math.PI*(1.1+i/n*.8);var px=x+Math.cos(a)*r,py=cy+Math.sin(a)*r;
      if(i){var m=(a+pa)/2;d+='Q'+f(x+Math.cos(m)*r*1.13)+' '+f(cy+Math.sin(m)*r*1.13)+' '+f(px)+' '+f(py);}else d+='L'+f(px)+' '+f(py);
      v+='M'+f(x)+' '+f(cy)+'L'+f(x+Math.cos(a)*r*.86)+' '+f(cy+Math.sin(a)*r*.86);pa=a;}
    return '<path d="M'+f(x)+' '+f(y+h*.05)+'L'+f(x)+' '+f(cy)+'" stroke="'+o+'" stroke-width="'+f(h*.08+ow*2)+'" stroke-linecap="round"/>'+
      '<path d="'+d+'Z" fill="'+c+'" stroke="'+o+'" stroke-width="'+f(ow*2)+'" stroke-linejoin="round" paint-order="stroke"/>'+
      '<path d="M'+f(x)+' '+f(y+h*.05)+'L'+f(x)+' '+f(cy)+'" stroke="'+c+'" stroke-width="'+f(h*.08)+'" stroke-linecap="round"/>'+
      '<path d="'+v+'" stroke="'+c2+'" stroke-width="'+f(h*.022)+'" stroke-linecap="round" fill="none" opacity=".75"/>'}
  function tubes(x,y,h,c,o,ow,c2){var n=4+Math.floor(rnd()*3),w=h*.17,t=[],s='',i;
    for(i=0;i<n;i++)t.push({x:x+(i-(n-1)/2)*w*.86+R(-2,2),h:h*R(.4,1)});
    t.sort(function(a,b){return b.h-a.h});
    for(i=0;i<n;i++){var q=t[i];s+='<rect x="'+f(q.x-w/2)+'" y="'+f(y-q.h)+'" width="'+f(w)+'" height="'+f(q.h+w)+'" rx="'+f(w/2)+'" fill="'+c+'" stroke="'+o+'" stroke-width="'+f(ow*2)+'" paint-order="stroke"/>'+
      '<ellipse cx="'+f(q.x)+'" cy="'+f(y-q.h+w*.42)+'" rx="'+f(w*.27)+'" ry="'+f(w*.16)+'" fill="'+c2+'"/>';}
    return s}
  function kelp(x,y,h,c,o,ow,c2){var n=14,L=[],Rr=[],M=[],ph=R(0,6),amp=h*.07,i;
    for(i=0;i<=n;i++){var t=i/n,cx=x+Math.sin(t*5+ph)*amp*t,cy=y+h*.04-h*t,hw=Math.abs(h)*.075*(Math.pow(Math.sin(Math.PI*Math.min(1,t*1.02)),.6)+.12);
      L.push(f(cx-hw)+' '+f(cy));Rr.unshift(f(cx+hw)+' '+f(cy));M.push(f(cx)+' '+f(cy));}
    return '<path d="M'+L.join('L')+'L'+Rr.join('L')+'Z" fill="'+c+'" stroke="'+o+'" stroke-width="'+f(ow*2)+'" stroke-linejoin="round" paint-order="stroke"/>'+
      '<path d="M'+M.join('L')+'" stroke="'+c2+'" stroke-width="'+f(Math.abs(h)*.014)+'" fill="none" opacity=".7"/>'}
  function mound(x,y,h,c,o,ow,c2){var r=h*.6,s='<path d="M'+f(x-r)+' '+f(y+4)+'A'+f(r)+' '+f(r*.82)+' 0 0 1 '+f(x+r)+' '+f(y+4)+'Z" fill="'+c+'" stroke="'+o+'" stroke-width="'+f(ow*2)+'" stroke-linejoin="round" paint-order="stroke"/>';
    for(var j=1;j<4;j++)for(var a=.25;a<2.95;a+=.42/j*1.6){var rr=r*j/4.2;s+='<circle cx="'+f(x-Math.cos(a)*rr)+'" cy="'+f(y-Math.sin(a)*rr*.82)+'" r="'+f(h*.035)+'" fill="'+c2+'"/>';}
    return s}
  function anem(x,y,h,c,o,ow,c2){var n=7,a='',b='',d='',i;
    for(i=0;i<n;i++){var dx=(i-(n-1)/2)*h*.17+R(-3,3),ty=y-h*R(.6,1),p='M'+f(x+dx*.25)+' '+f(y+h*.04)+'Q'+f(x+dx*.2)+' '+f(y-h*.55)+' '+f(x+dx)+' '+f(ty);
      a+=p;d+='<circle cx="'+f(x+dx)+'" cy="'+f(ty)+'" r="'+f(h*.055)+'" fill="'+c2+'"/>';}
    return '<g fill="none" stroke-linecap="round"><path d="'+a+'" stroke="'+o+'" stroke-width="'+f(h*.085+ow*2)+'"/><path d="'+a+'" stroke="'+c+'" stroke-width="'+f(h*.085)+'"/></g>'+d}
  var KIND=[branch,fan,tubes,kelp,branch,anem,mound,fan];

  function build(){
    W=intro.clientWidth||innerWidth;H=intro.clientHeight||innerHeight;ox=W/2;oy=H*.42;seed=20261230;layers=[];
    var U=Math.min(W*1.05,H*.66),SF=[1,.88,.76,.66,.57,.5,.44,.39],html='',i,k;
    // light at the far end of the reef (the invite's paper)
    for(i=NL-1;i>=0;i--){
      var fog=i*.08,base=H*(.935-i*.045),wall=H*(.13-i*.011),sf=SF[i],o=mix('#ffffff',fog*.8),ow=Math.max(1.4,3.2*sf);
      function top(x){var u=x/W*2-1;return base-wall*Math.pow(Math.abs(u),2.3)+Math.sin(x*.021*(1+i*.3)+i*2)*7*sf+Math.sin(x*.05+i)*3*sf}
      var d='M'+f(-W*.3)+' '+f(H*1.5)+'L'+f(-W*.3)+' '+f(top(0)-wall*.5),x;
      for(x=0;x<=W;x+=W/26)d+='L'+f(x)+' '+f(top(x));
      d+='L'+f(W*1.3)+' '+f(top(W)-wall*.5)+'L'+f(W*1.3)+' '+f(H*1.5)+'Z';
      var s='<svg class="lay" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" style="transform-origin:'+f(ox)+'px '+f(oy)+'px">';
      if(i===NL-1)s+='<defs><pattern id="inhd" width="11" height="11" patternUnits="userSpaceOnUse"><circle cx="5.5" cy="5.5" r="2.3" fill="#fff"/></pattern></defs>';
      // corals: tall clusters on the canyon sides, short ones across the middle
      var n=Math.max(7,Math.round(W/58)),cs=[];
      for(k=0;k<n;k++){var u=(k+R(.15,.85))/n,side=Math.abs(u*2-1),cx=u*W,ch=U*sf*(side>.62?R(.36,.62):side>.4?R(.2,.3):R(.11,.18));
        cs.push({x:cx,h:ch,fn:pick(KIND),c:pick(PAL)});}
      cs.sort(function(a,b){return b.h-a.h});
      var back='',front='';
      for(k=0;k<cs.length;k++){var q=cs[k],c2=mix(pick(['#ffffff','#fff3c4','#3a1fb0']),fog+.25),
        g='<g class="sw" style="--t:'+R(2.4,4.2).toFixed(2)+'s;--d:-'+R(0,4).toFixed(2)+'s">'+q.fn(q.x,top(q.x)+6*sf,q.h,mix(q.c,fog),o,ow,c2)+'</g>';
        if(k%3===2)front+=g;else back+=g;}
      if(i%2===0){for(k=0;k<6;k++){var hu=k<3?R(-.05,.1):R(.9,1.05);
        back+='<g class="sw up" style="--t:'+R(2.6,4.4).toFixed(2)+'s;--d:-'+R(0,4).toFixed(2)+'s">'+kelp(hu*W,-H*.03,-H*R(.1,.22)*(.6+sf*.5),mix(pick(['#8cf5a8','#6ff0e4','#b9a6ff','#ff9ec7']),fog),o,ow,mix('#ffffff',fog+.2))+'</g>';}}
      s+=back+'<path d="'+d+'" fill="'+mix(DUNE[i],fog*.9)+'" stroke="'+mix('#b9a6ff',fog)+'" stroke-width="'+f(1.6*sf+.6)+'" stroke-linejoin="round"/>'+
        '<path d="'+d+'" fill="url(#inhd)" opacity="'+(.13-i*.01).toFixed(3)+'"/>';
      // a few low pieces in front of the dune edge
      s+='<g transform="translate(0,'+f(18*sf)+')">'+front+'</g></svg>';
      html+=s;
      // drifting bubbles and paper fish between the reef layers
      if(i>0){var fx='<div class="lay fx" style="width:'+W+'px;height:'+H+'px;transform-origin:'+f(ox)+'px '+f(oy)+'px">';
        for(k=0;k<4;k++)fx+='<i class="ib" style="--x:'+R(4,94).toFixed(1)+'%;--y:'+R(70,104).toFixed(1)+'%;--s:'+f(R(10,30)*(.5+sf*.6))+'px;--t:'+R(7,13).toFixed(1)+'s;--d:-'+R(0,12).toFixed(1)+'s"></i>';
        if(i===2||i===4||i===1||i===6){var fc=mix(pick(['#ffd77a','#ff9ec7','#6ff0e4']),fog);
          fx+='<span class="fish'+(i===2||i===6?' rev':'')+'" style="--y:'+R(30,56).toFixed(0)+'%;--s:'+f(U*.2*sf)+'px;--t:'+R(20,30).toFixed(0)+'s;--d:-'+R(2,18).toFixed(0)+'s"><svg viewBox="0 0 62 36"><path d="M4 18Q22 1 44 14L58 4 54 18 58 32 44 22Q22 35 4 18Z" fill="'+fc+'" stroke="'+o+'" stroke-width="5" stroke-linejoin="round" paint-order="stroke"/><path d="M26 9Q31 18 26 27" fill="none" stroke="'+o+'" stroke-width="2" opacity=".7"/><circle cx="14" cy="16" r="2.4" fill="#2b2523"/></svg></span>';}
        html+=fx+'</div>';}
    }
    reef.innerHTML=html;
    var els=reef.children,di=[];
    // children order: portal, then per layer i=5..0: svg, fx (i>0)
    var j=0;for(i=NL-1;i>=0;i--){layers.push({el:els[j++],d:DEP[i]});if(i>0)layers.push({el:els[j++],d:DEP[i]-(DEP[i]-DEP[i-1])*.45});}
    frame(0,0);
  }
  function frame(z,t){
    for(var i=0;i<layers.length;i++){var L=layers[i],rel=L.d-z,den=P+rel,st=L.el.style;
      if(den<P*.1&&!L.keep){st.visibility='hidden';continue;}
      st.visibility='';st.transform='scale('+((P+L.d)/Math.max(den,1)).toFixed(4)+')';
      st.opacity=L.keep||rel>=0?1:Math.max(0,1+rel/(P*.7)).toFixed(3);}
  }
  // idle: the camera breathes; opened: it swims forward with a little roll
  var t0=performance.now(),tGo=0,DUR=5400,ZEND;
  function loop(now){
    if(gone)return;
    if(!going){frame(Math.sin((now-t0)/1900)*16+16,0);reef.style.transform='translate('+(Math.sin((now-t0)/2600)*4).toFixed(2)+'px,'+(Math.cos((now-t0)/2100)*3).toFixed(2)+'px)';}
    else{var t=Math.min(1,(now-tGo)/DUR),e=.5-Math.cos(Math.PI*Math.pow(t,1.15))/2,w=Math.sin(t*Math.PI);
      frame(ZEND*e,t);
      reef.style.transform='translate('+(Math.sin(t*9)*10*w).toFixed(2)+'px,'+(Math.cos(t*7)*6*w).toFixed(2)+'px) rotate('+(Math.sin(t*8)*1.6*w).toFixed(3)+'deg)';
      if(t>.62&&!intro.classList.contains('out'))reveal();
      if(t>=1)return;}
    requestAnimationFrame(loop);
  }
  function reveal(){intro.classList.add('out');root.classList.remove('gated');scrollTo(0,0);
    setTimeout(function(){gone=true;intro.remove();},1500);}
  function open(){
    if(going)return;going=true;intro.classList.add('go');
    if(reduce){reveal();return;}
    ZEND=DEP[NL-1]+P*.95;tGo=performance.now();
    // bubbles burst from the button
    for(var i=0;i<14;i++){var b=document.createElement('i');b.className='ib';var a=Math.PI*2*i/14;
      b.style.cssText='--x:50%;--y:58%;--s:'+(10+Math.random()*18).toFixed(0)+'px;animation:inburst .9s ease-out forwards;--tx:'+(Math.cos(a)*(70+Math.random()*90)).toFixed(0)+'px;--ty:'+(Math.sin(a)*(50+Math.random()*80)-60).toFixed(0)+'px;z-index:6';
      intro.appendChild(b);}
  }
  btn.addEventListener('click',open);
  var rz;addEventListener('resize',function(){if(going)return;clearTimeout(rz);rz=setTimeout(build,150);});
  build();requestAnimationFrame(loop);
})();
</script>
