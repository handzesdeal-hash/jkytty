const $ = id => document.getElementById(id);

const suits = ["♠","♥","♦","♣"];
const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

let deck = [];
let dealer = [];
let player = [];

function buildDeck(){
  deck = [];
  for(const s of suits){
    for(const r of ranks){
      deck.push({r,s});
    }
  }
  deck.sort(()=>Math.random()-0.5);
}

function val(c){
  if(c.r==="A") return 11;
  if(["K","Q","J"].includes(c.r)) return 10;
  return Number(c.r);
}

function total(hand){
  let t=0,a=0;
  hand.forEach(c=>{
    t+=val(c);
    if(c.r==="A") a++;
  });
  while(t>21 && a>0){t-=10;a--}
  return t;
}

function draw(){
  return deck.pop();
}

function render(){
  $("dealer").innerHTML = dealer.map(c=>`<div class="card">${c.r}${c.s}</div>`).join("");
  $("player").innerHTML = player.map(c=>`<div class="card">${c.r}${c.s}</div>`).join("");
}

$("deal").onclick = ()=>{
  buildDeck();
  dealer=[draw(),draw()];
  player=[draw(),draw()];
  render();
  $("status").textContent = "Your turn";
};

$("hit").onclick = ()=>{
  player.push(draw());
  render();
  if(total(player)>21){
    $("status").textContent="Bust";
  }
};

$("stand").onclick = ()=>{
  while(total(dealer)<17){
    dealer.push(draw());
  }
  render();
  const pt=total(player), dt=total(dealer);
  if(dt>21||pt>dt) $("status").textContent="You win";
  else if(pt===dt) $("status").textContent="Push";
  else $("status").textContent="You lose";
};
