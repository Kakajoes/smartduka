* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Arial, sans-serif;
  background: #081a15;
  color: #ebfff6;
}
button, input, select {
  font: inherit;
}
button {
  cursor: pointer;
}
.app-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  min-height: 100vh;
}
.sidebar {
  background: #0d201a;
  padding: 20px 16px;
  border-right: 1px solid #1f4539;
}
.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 30px;
}
.logo {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg, #3dd68c, #a7f7d5);
  color: #032517;
  font-weight: 700;
}
.brand h1 { margin: 0; font-size: 1.1rem; }
.brand small { color: #9bc8b2; }
.nav {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  color: #dffcf0;
  padding: 10px 12px;
  border-radius: 10px;
  margin: 6px 0;
  text-decoration: none;
}
.nav.active, .nav:hover {
  background: #143d2d;
  border-color: #2f6d56;
}
.status-card {
  margin-top: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: #0f261d;
  border: 1px solid #1e4437;
  padding: 12px;
  border-radius: 12px;
}
.dot {
  width: 10px;
  height: 10px;
  display: inline-block;
  border-radius: 50%;
}
.dot.green { background: #35d27e; }

.main-panel {
  padding: 24px;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.actions { display: flex; gap: 10px; }
.primary, .secondary, .ghost {
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  color: #06281c;
  font-weight: 700;
}
.primary { background: linear-gradient(135deg, #45d88d, #9ff6c7); }
.secondary { background: #18493d; color: #dffcf0; }
.ghost { background: transparent; border: 1px solid #274d41; color: #e8fff4; }
.large { width: 100%; margin-top: 12px; }
.page { display: none; }
.page.active { display: block; }
.panel-grid {
  display: grid;
  grid-template-columns: 1.35fr 0.65fr;
  gap: 18px;
}
.panel {
  background: #0d2018;
  border: 1px solid #1e4336;
  border-radius: 16px;
  padding: 18px;
  margin-bottom: 18px;
}
.wide { min-height: 480px; }
.toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}
.toolbar.stack { display: grid; }
input, select {
  width: 100%;
  background: #081b15;
  color: #ebfff6;
  border: 1px solid #224d40;
  border-radius: 10px;
  padding: 12px 14px;
  outline: none;
}
.upload-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 170px;
  padding: 10px 14px;
  border-radius: 10px;
  cursor: pointer;
}
.upload-label input {
  display: none;
}
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}
.product-card {
  background: #112c23;
  border: 1px solid #234e3f;
  border-radius: 12px;
  padding: 12px;
}
.product-card h4 { margin: 8px 0 6px; font-size: 1rem; }
.product-card .meta { color: #9ed0b7; font-size: 0.8rem; }
.product-card .price { display: block; font-weight: 700; font-size: 1.1rem; margin-top: 10px; }
.product-card button {
  width: 100%;
  margin-top: 10px;
}
.cart-list { display: grid; gap: 10px; max-height: 360px; overflow: auto; }
.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #0f251d;
  border: 1px solid #214f3d;
  border-radius: 10px;
  padding: 10px 12px;
}
.cart-item strong { display: block; }
.totals { margin-top: 18px; }
.totals > div { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.total-row { font-size: 1.2rem; }
.hidden { display: none !important; }
.muted { color: #9bc8b2; }
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 18px;
}
.mini-card {
  background: #0d2018;
  border: 1px solid #1f4839;
  border-radius: 12px;
  padding: 18px;
}
.label { color: #9fcab6; display: block; margin-bottom: 8px; }
.mini-card strong { font-size: 1.7rem; }
.login-box {
  max-width: 420px;
  margin: 120px auto;
  background: #0d2018;
  border: 1px solid #214f3d;
  border-radius: 16px;
  padding: 24px;
}
.login-box h1 { margin-top: 0; }
.form-group { margin-bottom: 16px; }
.shop-body, .admin-body { background: #071711; }
.shop-header {
  padding: 18px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #20463c;
}
.shop-search { padding: 16px 20px; }
.shop-products {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  padding: 0 20px 30px;
}

@media (max-width: 768px) {
  .app-shell {
    grid-template-columns: 1fr;
  }
  .panel-grid,
  .card-grid {
    grid-template-columns: 1fr;
  }
  .sidebar {
    border-right: none;
    border-bottom: 1px solid #1f4539;
  }
}

""" ,"owner":"Kakajoes","repo":"smartduka","path":"public/styles.css","sha":null}]}    
  ]}