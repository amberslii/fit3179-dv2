(() => {
  const root=document.getElementById('chapter-4');
  if(!root||!window.DV2_CHECKOUT)return;
  const data=window.DV2_CHECKOUT, records=[];
  const tooltip=document.createElement('div');tooltip.id='checkout-tooltip';tooltip.hidden=true;tooltip.setAttribute('role','tooltip');document.body.append(tooltip);
  function showTooltip(_handler,event,_item,value){
    if(!value){tooltip.hidden=true;return;}
    tooltip.replaceChildren();
    for(const [name,text] of Object.entries(value)){const row=document.createElement('div');row.textContent=name+': '+text;tooltip.append(row);}
    tooltip.hidden=false;
    tooltip.style.left=Math.max(8,Math.min(innerWidth-tooltip.offsetWidth-8,event.clientX+14))+'px';
    tooltip.style.top=Math.max(8,Math.min(innerHeight-tooltip.offsetHeight-8,event.clientY+14))+'px';
  }
  async function addChart(id,name,config={}){
    const host=document.getElementById(id),width=Math.floor(host.clientWidth);
    const height=typeof config.height==='function'?config.height(width):config.height;
    const view=new vega.View(vega.parse(data.specs[name]),{renderer:'svg',container:host,tooltip:showTooltip}).width(width).height(height);
    Object.entries(config.signals||{}).forEach(([k,v])=>view.signal(k,v));
    await view.runAsync();host.dataset.ready='true';
    records.push({host,view,height:config.height,width});return view;
  }
  async function boot(){
    await Promise.all(data.choices.map(row=>addChart(row.host,'waffle',{height:width=>width,signals:{percent:row.percent,question:row.label}})));
    await addChart('checkout-radar','radar',{height:width=>width<500?400:520});
    const priceView=await addChart('checkout-lollipop','premium',{height:505});
    const select=document.getElementById('checkout-price-band');
    data.premium.forEach(row=>select.add(new Option(row.label,row.id)));
    function selectBand(id){
      const row=data.premium.find(d=>d.id===id);if(!row)return;
      select.value=id;priceView.signal('selectedBand',id).runAsync().catch(console.error);
      document.getElementById('checkout-price-example-value').textContent=row.priceExample;
      document.getElementById('checkout-price-example-detail').textContent=row.detail;
      root.dataset.priceBand=id;
    }
    select.addEventListener('change',()=>selectBand(select.value));
    priceView.addEventListener('click',(_event,item)=>{if(item?.datum?.id)selectBand(item.datum.id);});
    selectBand('RM23_04');
    let pending=0;
    const resize=()=>{cancelAnimationFrame(pending);pending=requestAnimationFrame(()=>{records.forEach(record=>{
      const width=Math.floor(record.host.clientWidth);if(width===record.width||width<1)return;
      record.width=width;const height=typeof record.height==='function'?record.height(width):record.height;
      record.view.width(width).height(height).runAsync().catch(console.error);
    });});};
    const observer=new ResizeObserver(resize);records.forEach(record=>observer.observe(record.host));
    root.dataset.ready='true';
  }
  boot().catch(error=>{console.error(error);root.dataset.ready='error';const warning=document.createElement('p');warning.className='chart-error';warning.textContent='A checkout chart could not load. Please refresh the page.';root.append(warning);});
})();
