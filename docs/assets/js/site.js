/* Progressive static page. All paths are relative for GitHub project Pages. */
(() => {
  'use strict';
  const chartViews = {};
  const number = new Intl.NumberFormat('en-AU');
  const byId = id => document.getElementById(id);
  async function get(url, type = 'json') {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return response[type]();
  }
  function message(host, error) {
    host.replaceChildren();
    const p = document.createElement('p');
    p.className = 'error';
    p.textContent = 'This chart could not load. Please use a local HTTP server and check the data link below.';
    host.append(p);
    console.error(error);
  }
  function configure(spec, host, mode) {
    const narrow = host.clientWidth < 540;
    spec.width = Math.max(250, Math.floor(host.clientWidth));
    if (host.id === 'dairy-map') {
      spec.height = narrow ? 370 : 570;
      spec.layer[0].encoding.color.legend.gradientLength = narrow ? 240 : 350;
      return spec;
    }
    if (mode === 'vega-lite') {
      const consumer = ['logo-attributes','premium-bands'].includes(host.id);
      spec.height = consumer ? (host.id === 'logo-attributes' ? 360 : 340) : 18 * (narrow ? 37 : 32);
      spec.config.axisY.labelLimit = narrow ? 130 : 265;
      spec.config.axisY.labelFontSize = narrow ? 10 : 12;
      spec.config.axisX = { labelFontSize: narrow ? 10 : 12, titleFontSize: narrow ? 10 : 12 };
      if (host.id === 'premium-bands') spec.config.axisX.labelFontSize = narrow ? 8 : 12;
    } else { spec.height = narrow ? 520 : 470; }
    return spec;
  }
  async function boot() {
    if (!window.vega || !window.vegaEmbed) throw new Error('Vega libraries unavailable');
    const [csv, metadata, labelRows] = await Promise.all([
      get('data/processed/chart_data/ch1_abs_product_supply.csv', 'text'),
      get('assets/data/ch1_display_metadata.json'),
      get('assets/data/ch1_labels.json')
    ]);
    const data = vega.read(csv, {type:'csv', parse:{australian_production:'number',imports:'number',supply_bp:'number',local_production_share_of_total_supply_value:'number'}});
    const labels = new Map(labelRows.map(row => [row.iopc, row.display_label]));
    const products = new Map(data.map(row => [row.iopc, row]));
    const stateRows = await get('assets/data/ch3_dairy_state_exports.json');
    for (const row of stateRows) byId('state-inspector').add(new Option(row.state_name, row.state_code));
    byId('state-inspector').addEventListener('change', e => {
      const row = stateRows.find(r => r.state_code === e.target.value);
      byId('state-detail').textContent = row ? `${row.state_name}: ${row.display_value}. TRIEC 1213 — Dairy products processed; 2025; State of Origin. ${row.value_aud === null ? 'Missing records must not be read as zero.' : 'Recorded nominal export value, FOB; excludes re-exports.'}` : 'Choose a state or territory to read its value.';
    });
    for (const group of metadata.groups) {
      const option = new Option(group.name, group.name); byId('group-filter').add(option);
      const span = document.createElement('span'), swatch = document.createElement('i');
      swatch.style.backgroundColor = group.color; span.append(swatch, document.createTextNode(group.name));
      byId('group-legend').append(span);
    }
    for (const row of data) byId('product-inspector').add(new Option(labels.get(row.iopc), row.iopc));
    for (const row of [...data].sort((a,b) => b.australian_production-a.australian_production).slice(0,3)) {
      const item = document.createElement('li'), name = document.createElement('span'), value = document.createElement('strong');
      name.textContent = labels.get(row.iopc); name.title = row.iopc_description;
      value.textContent = `A$${number.format(row.australian_production)} million`;
      item.append(name,value); byId('largest-production').append(item);
    }
    byId('subset-total').textContent = `A$${number.format(metadata.production_total_aud_million)} million in selected production`;
    function inspect(id) {
      const row = products.get(id);
      if (!row) return;
      byId('product-inspector').value = id;
      byId('tile-detail').textContent = `${row.iopc_description} (IOPC ${row.iopc}): A$${number.format(row.australian_production)} million in Australian Production, ${(row.australian_production / metadata.production_total_aud_million * 100).toFixed(1)}% of this selected production total. Editorial group: ${row.research_group}. FY2023–24, T1 Summary row ${row.source_row}.`;
    }
    byId('product-inspector').addEventListener('change', e => inspect(e.target.value));
    const table = document.createElement('table');
    table.innerHTML = '<caption>ABS T1 Summary · FY2023–24 · Values in A$ million</caption><thead><tr><th scope="col">Original IOPC category</th><th scope="col">Australian Production</th><th scope="col">Imports</th><th scope="col">Supply BP</th><th scope="col">Local production share</th></tr></thead>';
    const body = document.createElement('tbody');
    for (const row of data) {
      const tr = document.createElement('tr'), name = document.createElement('td'), code = document.createElement('small');
      name.textContent = row.iopc_description;
      code.textContent = `IOPC ${row.iopc} · T1 row ${row.source_row} · ${row.category_specificity === 'broad_composite' ? 'Broad composite group' : 'More specific category'}`;
      name.append(code); tr.append(name);
      for (const [key,label] of [['australian_production','Production'],['imports','Imports'],['supply_bp','Supply BP'],['local_production_share_of_total_supply_value','Local share']]) {
        const cell = document.createElement('td'); cell.className = 'num'; cell.dataset.label = label;
        cell.textContent = key.startsWith('local_') ? `${(row[key]*100).toFixed(1)}%` : number.format(row[key]); tr.append(cell);
      }
      body.append(tr);
    }
    table.append(body); byId('data-table').append(table);
    const configs = [ ['dumbbell','vis/ch1_dumbbell.vl.json','vega-lite'], ['share-plot','vis/ch1_share_dotplot.vl.json','vega-lite'], ['treemap','vis/ch1_production_treemap.vg.json','vega'], ['dairy-map','vis/ch3_dairy_choropleth.vl.json','vega-lite'], ['logo-attributes','vis/ch4_logo_attributes.vl.json','vega-lite'], ['premium-bands','vis/ch4_premium_bands.vl.json','vega-lite'] ];
    let resizeTimer;
    async function renderOne([id, url, mode]) {
      const host = byId(id);
      try {
        const spec = configure(await get(url), host, mode);
        chartViews[id]?.finalize();
        const result = await vegaEmbed(host, spec, {mode, renderer:'svg', actions:false, tooltip:true, defaultStyle:false});
        chartViews[id] = result.view;
        if (id === 'dumbbell') await filterGroup(byId('group-filter').value);
        if (id === 'treemap') result.view.addSignalListener('selectedCategory', (_, value) => inspect(value));
        host.dataset.rendered = 'true';
      } catch (error) { host.dataset.rendered = 'error'; message(host,error); }
    }
    async function filterGroup(group) {
      const count = data.filter(row => group === 'All categories' || row.research_group === group).length;
      await chartViews.dumbbell.height(count * (byId('dumbbell').clientWidth < 540 ? 37 : 32)).signal('groupFilter', group).runAsync();
    }
    await Promise.all(configs.map(renderOne));
    byId('group-filter').addEventListener('change', async e => {
      try { await filterGroup(e.target.value); }
      catch(error) { message(byId('dumbbell'),error); }
    });
    let lastWidth = document.documentElement.clientWidth;
    window.addEventListener('resize', () => {
      if (document.documentElement.clientWidth === lastWidth) return;
      lastWidth = document.documentElement.clientWidth;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => Promise.all(configs.map(renderOne)),180);
    });
    // Read-only handles for render/data validation in local browser tests.
    window.dv2 = {views:chartViews, categoryCount:data.length, productionTotal:metadata.production_total_aud_million};
  }
  boot().catch(error => ['dumbbell','share-plot','treemap','dairy-map','logo-attributes','premium-bands'].forEach(id=>message(byId(id),error)));
})();
