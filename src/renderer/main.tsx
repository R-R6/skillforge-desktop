import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("找不到 #root 容器");
}

if (!window.skillforge) {
  ReactDOM.createRoot(root).render(
    <div className="bootstrap-error">
      <h1>SkillForge Desktop 初始化失败</h1>
      <p>Preload 脚本未正确加载，应用无法访问本地数据库与文件系统。</p>
      <p className="bootstrap-error-muted">请重新安装应用，或在开发模式下执行 <code>npm run rebuild:native</code> 后重启。</p>
    </div>,
  );
} else {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
