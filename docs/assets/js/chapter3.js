(() => {
  const root=document.getElementById('dv2-chapter-three-places');
  if(!root||!window.DV2_PLACES)return;
  const data=window.DV2_PLACES, $=s=>root.querySelector(s),groups=data.groups,views={},records=[];
  const get=name=>data.resources['data/processed/chapter3/'+name+'.json'];
  const fmt=n=>new Intl.NumberFormat('en-AU').format(n),pct=n=>(n*100).toFixed(1)+'%';
  const jobsPct=n=>n===0?'0%':n<.01?'<0.01%':n.toFixed(2)+'%';
  const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
  const icons=()=>window.lucide?.createIcons({root,attrs:{width:20,height:20}});
  const state={group:0,selectedState:'NSW',industry:'117',treeView:-1,sizeGroup:0,sizeBand:0,jobsGroup:0,region:'216',mapView:'national',product:'P14'};
  const scopes=['Bakery, confectionery, ice cream, cheese & other dairy','Wooden & metal furniture, mattresses and whiteware (tableware excluded)','Cleaning compounds, cosmetics & toiletries','Knitted products & clothing (knitting includes fabric)'];
  function readState(saved){const s=saved?.modelContent||saved;if(s?.chapter!==3)return;
    for(const key of ['group','jobsGroup','sizeGroup'])if(Number.isInteger(s[key])&&groups[s[key]])state[key]=s[key];
    if(data.states.includes(s.selectedState))state.selectedState=s.selectedState;
    if(get('industries').some(d=>d.code===s.industry))state.industry=s.industry;
    if(Number.isInteger(s.sizeBand)&&s.sizeBand>=0&&s.sizeBand<5)state.sizeBand=s.sizeBand;
    if(s.treeView===null||s.treeView===-1)state.treeView=-1;else if(Number.isInteger(s.treeView)&&groups[s.treeView])state.treeView=s.treeView;
    if(get('regional-employment').some(d=>d.id===s.region))state.region=s.region;
    if(['national','regional'].includes(s.mapView))state.mapView=s.mapView;else if(s.mapView==='southeast')state.mapView='regional';
    if(get('products').some(d=>d.id===s.product))state.product=s.product;
  }
  readState(window.openai?.widgetState);
  function save(){window.openai?.setWidgetState?.({modelContent:{chapter:3,...state},privateContent:null})?.catch(()=>{});}
  const tip=document.createElement('div');tip.className='places-tooltip';tip.hidden=true;tip.setAttribute('role','tooltip');document.body.append(tip);
  function tooltip(_handler,event,_item,value){if(!value){tip.hidden=true;return;}tip.textContent=typeof value==='string'?value:JSON.stringify(value);tip.hidden=false;tip.style.left=Math.max(8,Math.min(innerWidth-tip.offsetWidth-8,event.clientX+12))+'px';tip.style.top=Math.max(8,Math.min(innerHeight-tip.offsetHeight-8,event.clientY+12))+'px';}
  function restoreFocus(selector){$(selector)?.focus({preventScroll:true});}
  function buttons(selector,attribute,selected,action){
    $(selector).innerHTML=groups.map((g,i)=>`<button type="button" ${attribute}="${i}" aria-pressed="${i===selected}" style="--cat:${g.color}"><span class="cat-icon">${icon(g.icon)}</span><span class="category-button-copy"><strong>${g.name}</strong><small>${i===selected?'✓ Showing':'View →'}</small></span></button>`).join('');
    $(selector).querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>action(+b.getAttribute(attribute))));
  }
  function stateControls(){
    buttons('.category-picker','data-category',state.group,group=>{state.group=group;state.industry=get('industries').find(d=>d.group===group).code;updateStates();restoreFocus(`[data-category="${group}"]`);});
    $('.category-live-status').textContent=groups[state.group].name+' · Both charts update together';
    const rows=get('state-businesses').filter(d=>d.group===state.group),selected=rows.find(d=>d.id===state.selectedState),total=rows.reduce((n,r)=>n+r.n,0);
    $('.selected-state').innerHTML=`${data.stateNames[state.selectedState]} · <strong>${fmt(selected.n)}</strong> businesses · Share of this group's eight-state/territory total: <strong>${pct(selected.n/total)}</strong>`;
    const inds=get('industries').filter(d=>d.group===state.group);if(!inds.some(d=>d.code===state.industry))state.industry=inds[0].code;
    $('.heatmap-heading').textContent=groups[state.group].name+': where are the businesses?';
    $('.heatmap-current').innerHTML=`<span style="color:${groups[state.group].color}">${icon(groups[state.group].icon)}</span><strong>${groups[state.group].name}</strong><small>${inds.length} industries</small>`;
    const cell=get('heatmap-cells').find(d=>d.code===state.industry&&d.state===state.selectedState);
    $('.heat-selection').innerHTML=`${cell.name} · ${cell.state}: <strong>${fmt(cell.n)}</strong> businesses · Share of this industry's eight-state/territory total: <strong>${pct(cell.share)}</strong>`;icons();
  }
  function treeControls(){
    $('.tree-category-legend').innerHTML='<span class="tree-guide">Choose a group to zoom</span><button type="button" data-tree-view="-1" aria-pressed="'+(state.treeView<0)+'">All groups</button>'+groups.map((g,i)=>`<button type="button" data-tree-view="${i}" aria-pressed="${state.treeView===i}" style="--cat:${g.color}"><span class="tree-legend-icon">${icon(g.icon)}</span>${g.name}</button>`).join('');
    $('.tree-category-legend').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{state.treeView=+b.dataset.treeView;if(state.treeView>=0)state.sizeGroup=state.treeView;updateTree();restoreFocus(`[data-tree-view="${state.treeView}"]`);}));
    const rows=get('business-size-tree').filter(d=>d.band!==undefined),chosen=rows.find(d=>d.group===state.sizeGroup&&d.band===state.sizeBand),total=rows.filter(d=>d.group===state.sizeGroup).reduce((n,d)=>n+d.value,0);
    $('.tree-detail').innerHTML=`<label>Find a tile <select class="size-group" aria-label="Find a product group">${groups.map((g,i)=>`<option value="${i}">${g.name}</option>`).join('')}</select></label><select class="size-band" aria-label="Find an employee-size band">${data.bandNames.map((b,i)=>`<option value="${i}">${b}</option>`).join('')}</select><span><strong>${fmt(chosen.value)}</strong> businesses · Share of group: <strong>${pct(chosen.value/total)}</strong></span>`;
    $('.size-group').value=state.sizeGroup;$('.size-band').value=state.sizeBand;
    $('.size-group').addEventListener('change',e=>{state.sizeGroup=+e.target.value;if(state.treeView>=0)state.treeView=state.sizeGroup;updateTree();restoreFocus('.size-group');});
    $('.size-band').addEventListener('change',e=>{state.sizeBand=+e.target.value;updateTree();restoreFocus('.size-band');});
    $('.treemap').parentElement.querySelector('.reading-key').textContent=state.treeView<0?'Colour = group · Tile = employee size · Area = businesses':'Zoomed: '+groups[state.treeView].name+' · Areas show businesses within this group';
    const small=rows.filter(d=>d.band<3).reduce((n,d)=>n+d.value,0),all=rows.reduce((n,d)=>n+d.value,0);
    $('#size-takeaway').innerHTML=`About <strong>${Math.round(small/all*100)}%</strong> of these businesses have fewer than 20 employees, including non-employing businesses.`;icons();
  }
  function jobsControls(){
    buttons('.jobs-category-picker','data-jobs-category',state.jobsGroup,group=>{state.jobsGroup=group;updateJobs();restoreFocus(`[data-jobs-category="${group}"]`);});
    const rows=get('regional-employment').filter(d=>d.group===state.jobsGroup),chosen=rows.find(d=>d.id===state.region),g=groups[state.jobsGroup];
    $('.jobs-scope').style.setProperty('--cat',g.color);$('.jobs-scope').innerHTML=`<span class="jobs-scope-icon">${icon(g.icon)}</span><span>${scopes[state.jobsGroup]}</span>`;
    $('.map-scale').innerHTML=data.jobLegend.map((label,i)=>`<span data-jobs-bin="${i}"><i style="background:${data.jobColors[state.jobsGroup][i]}"></i>${label.replaceAll('<','&lt;')}</span>`).join('');
    const select=$('.region-select');if(!select.options.length)rows.slice().sort((a,b)=>a.name.localeCompare(b.name)).forEach(r=>select.add(new Option(r.name.replaceAll(' - ',' – '),r.id)));select.value=state.region;
    $('.region-value').innerHTML=`Selected industries: <strong>${fmt(chosen.n)}</strong> people / all local employment: ${fmt(chosen.total)} = <strong>${jobsPct(chosen.sharePct)}</strong>`;
    $('.jobs-selection-note').textContent=chosen.n===0?'The published total is zero; this does not prove there are no related jobs.':chosen.n<20?'Small published counts are affected by confidentiality adjustments. Compare with care.':'';
    root.querySelectorAll('[data-map-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mapView===state.mapView)));
    const high=rows.reduce((a,b)=>a.sharePct>=b.sharePct?a:b),large=rows.reduce((a,b)=>a.n>=b.n?a:b);
    $('.jobs-insight').style.setProperty('--cat',g.color);
    $('.jobs-insight-copy').innerHTML=`<p><strong>${high.name.replaceAll(' - ',' – ')}</strong> has the highest local share: <strong>${jobsPct(high.sharePct)}</strong> of all employment is in these selected industries.</p><p><strong>${large.name.replaceAll(' - ',' – ')}</strong> employs more people in these industries (<strong>${fmt(large.n)}</strong>), but they make up only <strong>${jobsPct(large.sharePct)}</strong> of its larger workforce.</p>`;
    $('.comparison-examples').innerHTML=[[high,'Locate highest share'],[large,'Locate most jobs']].map(([r,label])=>`<button type="button" data-compare="${r.id}" aria-pressed="${r.id===state.region}" aria-label="${label}: ${r.name}">${label} ↗</button>`).join('');
    $('.comparison-examples').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{state.region=b.dataset.compare;state.mapView='regional';updateJobs();$('.choropleth').scrollIntoView({block:'center'});}));icons();
  }
  function productControls(){
    const selected=get('products').find(p=>p.id===state.product),photo=data.photos[selected.id],g=groups[selected.group];
    $('.product-detail').style.setProperty('--cat',g.color);
    $('.product-detail').innerHTML=`<figure class="product-photo"><img src="${photo.src}" alt="${photo.caption}" width="${photo.width}" height="${photo.height}"></figure><span class="product-category">${icon(g.icon)} ${g.name}</span><span class="product-brand">${selected.brand}</span><h3>${selected.id==='P14'?'Murray Street Choc Mint Ice Cream':selected.name}</h3><span class="product-place">${selected.number} · ${selected.place}, ${selected.state}</span><p>${selected.statement}</p><a href="${selected.url}" target="_blank" rel="noopener noreferrer">Manufacturing-location source ↗</a><span class="photo-credit">Photo: <a href="${photo.page}" target="_blank" rel="noopener noreferrer">${photo.brand} official product page ↗</a>${selected.id==='P06'?' · Range image (includes base)':''}</span>`;
    $('.product-picker').innerHTML=get('products').slice().sort((a,b)=>a.number-b.number).map(d=>`<button type="button" data-product="${d.id}" aria-pressed="${d.id===state.product}" style="--cat:${groups[d.group].color}"><span class="product-dot"></span>${d.number} · ${d.brand}</button>`).join('');
    $('.product-picker').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{state.product=b.dataset.product;updateProducts();restoreFocus(`[data-product="${state.product}"]`);}));icons();
  }
  const interactive='.statePoints path,.stateLabels text,.stateCounts text,.heatCells path,.treeLeaves path,.regionShapes path,.productMainPoints path,.productInsetPoints path';
  function access(host){host.querySelectorAll(interactive).forEach(el=>{el.setAttribute('tabindex','0');el.setAttribute('role','button');});}
  async function addChart(key,selector,height){
    const host=$(selector);host.classList.add('places-vega');
    const spec=structuredClone(data.specs[key]);for(const d of spec.data)if(d.url&&data.resources[d.url]){d.values=structuredClone(data.resources[d.url]);delete d.url;}
    const width=Math.max(240,Math.floor(host.clientWidth-(key==='states'?16:0)));
    const view=new vega.View(vega.parse(spec),{renderer:'svg',container:host,tooltip}).width(width).height(height(width));
    views[key]=view;records.push({key,host,view,width,height});
    const activate=(event,item)=>{if(event.type==='keydown'&&!['Enter',' '].includes(event.key))return;const d=item?.datum,name=item?.mark?.name;if(!d)return;
      if(key==='states'&&['statePoints','stateLabels','stateCounts'].includes(name)){state.selectedState=d.id;updateStates();}
      if(key==='heatmap'&&['heatCells','heatValues'].includes(name)){state.selectedState=d.state;state.industry=d.code;updateStates();}
      if(key==='tree'&&name==='treeLeaves'){state.sizeGroup=d.group;state.sizeBand=d.band;updateTree();}
      if(key==='jobs'&&name==='regionShapes'){state.region=d.properties.id;updateJobs();}
      if(key==='products'&&['productMainPoints','productInsetPoints','productMainPlace','productInsetPlace'].includes(name)){state.product=d.id;updateProducts();}
      if(event.type==='keydown')event.preventDefault();
    };
    view.addEventListener('click',activate);view.addEventListener('keydown',activate);
    await view.runAsync();access(host);host.dataset.ready='true';return view;
  }
  let work=Promise.resolve();
  function run(key,signals){const record=records.find(r=>r.key===key);if(!record)return;
    work=work.then(async()=>{Object.entries(signals).forEach(([name,value])=>record.view.signal(name,value));
      const width=Math.max(240,Math.floor(record.host.clientWidth-(key==='states'?16:0)));record.width=width;
      record.view.width(width).height(record.height(width));await record.view.runAsync();access(record.host);
    }).catch(error=>{console.error(error);root.dataset.ready='error';});save();
  }
  function updateStates(){stateControls();run('states',{group:state.group,selectedState:state.selectedState});run('heatmap',{group:state.group,selectedState:state.selectedState,selectedIndustry:state.industry});}
  function updateTree(){treeControls();run('tree',{treeView:state.treeView,selectedGroup:state.sizeGroup,selectedBand:state.sizeBand});}
  function updateJobs(){jobsControls();run('jobs',{group:state.jobsGroup,selectedRegion:state.region,mapView:state.mapView});}
  function updateProducts(){productControls();run('products',{selectedProduct:state.product});}
  async function boot(){
    const heat=$('.heatmap');heat.innerHTML='<div class="heatmap-current"></div><div class="heatmap-vega"></div>';
    const legend=document.createElement('div');legend.className='tree-category-legend';$('.treemap').before(legend);
    stateControls();treeControls();jobsControls();productControls();
    await Promise.all([addChart('states','.cartogram',()=>426),addChart('heatmap','.heatmap-vega',w=>30+(w<400?52:60)*get('industries').filter(d=>d.group===state.group).length+84),addChart('tree','.treemap',()=>$('.treemap').clientHeight),addChart('jobs','.choropleth',w=>w<560?350:430),addChart('products','.product-map',w=>w<480?620:500)]);
    $('.region-select').addEventListener('change',e=>{state.region=e.target.value;updateJobs();});
    root.querySelectorAll('[data-map-view]').forEach(b=>b.addEventListener('click',()=>{state.mapView=b.dataset.mapView;updateJobs();}));
    updateStates();updateTree();updateJobs();updateProducts();await work;
    let pending=0;const observer=new ResizeObserver(()=>{cancelAnimationFrame(pending);pending=requestAnimationFrame(()=>{for(const record of records){const width=Math.max(240,Math.floor(record.host.clientWidth-(record.key==='states'?16:0)));if(width!==record.width)run(record.key,{});}});});records.forEach(r=>observer.observe(r.host));
    window.addEventListener('openai:set_globals',e=>{if(e.detail?.globals?.widgetState){readState(e.detail.globals.widgetState);updateStates();updateTree();updateJobs();updateProducts();}});
    root.dataset.ready='true';root.dataset.renderer='Vega';
  }
  boot().catch(error=>{console.error(error);root.dataset.ready='error';const p=document.createElement('p');p.className='chart-error';p.textContent='A Chapter 3 chart could not load. Please refresh the page.';root.prepend(p);});
})();
