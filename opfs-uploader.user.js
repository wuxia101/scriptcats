// ==UserScript==
// @name         OPFS 文件上传助手
// @namespace    https://scriptcat.org/
// @version      0.4.1
// @description  通过脚本猫菜单上传文件或文件夹到指定OPFS目录，带美观UI界面
// @author       ScriptCat Agent
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @grant        CAT.agent.opfs

// ==/UserScript==

"use strict";

// UI样式
const UI_STYLES = `
  #opfs-uploader-overlay {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: rgba(0, 0, 0, 0.5) !important;
    display: flex !important;
    justify-content: center !important;
    align-items: center !important;
    z-index: 2147483647 !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  }
  
  #opfs-uploader-dialog {
    background: white !important;
    border-radius: 12px !important;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3) !important;
    width: 500px !important;
    max-width: 90vw !important;
    max-height: 80vh !important;
    overflow: hidden !important;
    animation: opfs-slideIn 0.3s ease !important;
  }
  
  @keyframes opfs-slideIn {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  #opfs-uploader-header {
    padding: 20px 24px !important;
    border-bottom: 1px solid #e5e7eb !important;
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
  }
  
  #opfs-uploader-title {
    margin: 0 !important;
    font-size: 18px !important;
    font-weight: 600 !important;
    color: #1f2937 !important;
  }
  
  #opfs-uploader-close {
    width: 32px !important;
    height: 32px !important;
    border: none !important;
    background: #f3f4f6 !important;
    border-radius: 8px !important;
    cursor: pointer !important;
    font-size: 20px !important;
    color: #6b7280 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    transition: all 0.2s !important;
  }
  
  #opfs-uploader-close:hover {
    background: #e5e7eb !important;
    color: #374151 !important;
  }
  
  #opfs-uploader-body {
    padding: 24px !important;
    max-height: 50vh !important;
    overflow-y: auto !important;
  }
  
  #opfs-uploader-input-group {
    margin-bottom: 20px !important;
  }
  
  #opfs-uploader-label {
    display: block !important;
    margin-bottom: 8px !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    color: #374151 !important;
  }
  
  #opfs-uploader-path-input {
    width: 100% !important;
    padding: 10px 14px !important;
    border: 2px solid #e5e7eb !important;
    border-radius: 8px !important;
    font-size: 14px !important;
    box-sizing: border-box !important;
    transition: border-color 0.2s !important;
  }
  
  #opfs-uploader-path-input:focus {
    outline: none !important;
    border-color: #3b82f6 !important;
  }
  
  #opfs-uploader-dirs {
    margin-top: 16px !important;
  }
  
  #opfs-uploader-dirs-title {
    font-size: 13px !important;
    font-weight: 500 !important;
    color: #6b7280 !important;
    margin-bottom: 8px !important;
  }
  
  #opfs-uploader-dirs-list {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
  }
  
  .opfs-uploader-dir-btn {
    padding: 6px 12px !important;
    background: #f3f4f6 !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 6px !important;
    font-size: 13px !important;
    color: #374151 !important;
    cursor: pointer !important;
    transition: all 0.2s !important;
  }
  
  .opfs-uploader-dir-btn:hover {
    background: #e5e7eb !important;
    border-color: #d1d5db !important;
  }
  
  #opfs-uploader-footer {
    padding: 16px 24px !important;
    border-top: 1px solid #e5e7eb !important;
    display: flex !important;
    justify-content: flex-end !important;
    gap: 12px !important;
  }
  
  .opfs-uploader-btn {
    padding: 10px 20px !important;
    border: none !important;
    border-radius: 8px !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    cursor: pointer !important;
    transition: all 0.2s !important;
  }
  
  #opfs-uploader-cancel {
    background: #f3f4f6 !important;
    color: #374151 !important;
  }
  
  #opfs-uploader-cancel:hover {
    background: #e5e7eb !important;
  }
  
  #opfs-uploader-confirm {
    background: #3b82f6 !important;
    color: white !important;
  }
  
  #opfs-uploader-confirm:hover {
    background: #2563eb !important;
  }
  
  #opfs-uploader-empty {
    color: #9ca3af !important;
    font-size: 13px !important;
    font-style: italic !important;
  }
`;

// 创建UI界面
  function createFolderSelectUI(defaultPath = '') {
    return new Promise(async (resolve) => {

    const styleEl = document.createElement('style');
    styleEl.textContent = UI_STYLES + `
      #opfs-folder-browser {
        border: 1px solid #e5e7eb !important;
        border-radius: 8px !important;
        overflow: hidden !important;
      }

      #opfs-folder-current {
        padding: 10px 12px !important;
        background: #f9fafb !important;
        border-bottom: 1px solid #e5e7eb !important;
        font-size: 13px !important;
        color: #374151 !important;
      }

      #opfs-folder-list {
        max-height: 260px !important;
        overflow-y: auto !important;
      }

      .opfs-folder-item {
        width: 100% !important;
        padding: 12px 14px !important;
        border: none !important;
        background: white !important;
        text-align: left !important;
        cursor: pointer !important;
        font-size: 14px !important;
        color: #1f2937 !important;
        border-bottom: 1px solid #f3f4f6 !important;
      }

      .opfs-folder-item:hover {
        background: #f3f4f6 !important;
      }

      .opfs-folder-actions {
        display: flex !important;
        gap: 8px !important;
        margin-bottom: 12px !important;
      }

      .opfs-folder-action-btn {
        padding: 8px 12px !important;
        border: 1px solid #e5e7eb !important;
        border-radius: 6px !important;
        background: #f9fafb !important;
        cursor: pointer !important;
        font-size: 13px !important;
      }
    `;
    document.head.appendChild(styleEl);

    let currentPath = defaultPath || '';

    const overlay = document.createElement('div');
    overlay.id = 'opfs-uploader-overlay';

    overlay.innerHTML = `
      <div id="opfs-uploader-dialog">
        <div id="opfs-uploader-header">
          <h2 id="opfs-uploader-title">选择上传文件夹</h2>
          <button id="opfs-uploader-close" type="button">×</button>
        </div>

        <div id="opfs-uploader-body">
          <div class="opfs-folder-actions">
            <button class="opfs-folder-action-btn" id="opfs-folder-root" type="button">根目录</button>
            <button class="opfs-folder-action-btn" id="opfs-folder-up" type="button">上一级</button>
          </div>

          <div id="opfs-folder-browser">
            <div id="opfs-folder-current"></div>
            <div id="opfs-folder-list"></div>
          </div>
        </div>

        <div id="opfs-uploader-footer">
          <button class="opfs-uploader-btn" id="opfs-uploader-cancel" type="button">取消</button>
          <button class="opfs-uploader-btn" id="opfs-uploader-confirm" type="button">上传到此文件夹</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const currentEl = document.getElementById('opfs-folder-current');
    const listEl = document.getElementById('opfs-folder-list');

    const removeUI = () => {
      overlay.remove();
      styleEl.remove();
    };

    const finish = (path) => {
      removeUI();
      resolve(path);
    };

    async function renderFolder() {
      currentEl.textContent = `当前目录：/${currentPath}`;

      listEl.innerHTML = `<div style="padding:12px;color:#9ca3af;font-size:13px;">加载中...</div>`;

      let entries = [];
      try {
        entries = await CAT.agent.opfs.list(currentPath);
      } catch (err) {
        listEl.innerHTML = `<div style="padding:12px;color:#ef4444;font-size:13px;">无法读取目录：${err.message}</div>`;
        return;
      }

      const dirs = entries.filter(e => e.type === 'directory');

      if (dirs.length === 0) {
        listEl.innerHTML = `<div style="padding:12px;color:#9ca3af;font-size:13px;">当前目录没有子文件夹</div>`;
        return;
      }

      listEl.innerHTML = dirs.map(dir => `
        <button class="opfs-folder-item" type="button" data-name="${dir.name}">
          📁 ${dir.name}
        </button>
      `).join('');

      listEl.querySelectorAll('.opfs-folder-item').forEach(btn => {
        btn.addEventListener('click', async () => {
          currentPath = normalizeFolderPath(currentPath + btn.dataset.name + '/');
          await renderFolder();
        });
      });
    }

    document.getElementById('opfs-folder-root').addEventListener('click', async () => {
      currentPath = '';
      await renderFolder();
    });

    document.getElementById('opfs-folder-up').addEventListener('click', async () => {
      currentPath = getParentFolderPath(currentPath);
      await renderFolder();
    });

    document.getElementById('opfs-uploader-close').addEventListener('click', () => finish(null));
    document.getElementById('opfs-uploader-cancel').addEventListener('click', () => finish(null));

    document.getElementById('opfs-uploader-confirm').addEventListener('click', () => {
      finish(currentPath);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) finish(null);
    });

    await renderFolder();

    });
}

function normalizeFolderPath(path) {
  path = path
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/');

  return path && !path.endsWith('/') ? path + '/' : path;
}

function getParentFolderPath(path) {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts.length ? parts.join('/') + '/' : '';
}

// 注册上传文件的菜单命令
GM_registerMenuCommand("上传文件到OPFS", async () => {
  try {

    
    // 显示UI选择目标路径
    const targetPath = await createFolderSelectUI('');
    if (targetPath === null) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      await handleFileUpload(files, targetPath);
    };
    
    input.click();
    
  } catch (error) {
    alert(`上传过程出错: ${error.message}`);
    console.error(error);
  }
});

// 注册上传文件夹的菜单命令
GM_registerMenuCommand("上传文件夹到OPFS", async () => {
  try {
    // 获取现有目录
    let existingDirs = [];
    try {
      const entries = await CAT.agent.opfs.list('');
      existingDirs = entries
        .filter(e => e.type === 'directory')
        .map(e => e.name);
    } catch (err) {
      console.log('无法列出目录:', err);
    }
    
    // 显示UI选择目标路径
    const targetPath = await createFolderSelectUI('');
    if (targetPath === null) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      await handleFileUpload(files, targetPath);
    };
    
    input.click();
    
  } catch (error) {
    alert(`上传过程出错: ${error.message}`);
    console.error(error);
  }
});

// 通用文件上传处理函数
async function handleFileUpload(files, basePath) {
  if (files.length === 0) {
    alert('未选择文件');
    return;
  }
  
  const results = [];
  
  for (const file of files) {
    try {
      // 处理相对路径
      let relativePath = file.webkitRelativePath || file.name;
      
      // 构建保存路径
      const savePath = basePath + relativePath;
      
      // 读取文件内容
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type });
      
      // 保存到OPFS
      const result = await CAT.agent.opfs.write(savePath, blob);
      results.push({
        name: file.name,
        path: result.path,
        size: result.size,
        success: true
      });
    } catch (err) {
      results.push({
        name: file.name,
        error: err.message,
        success: false
      });
    }
  }
  
  // 显示结果
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
  let message = `上传完成！\n目标目录: ${basePath || '(根目录)'}\n成功: ${successCount} 个文件\n`;
  if (failCount > 0) {
    message += `失败: ${failCount} 个文件\n\n`;
    results.filter(r => !r.success).forEach(r => {
      message += `${r.name}: ${r.error}\n`;
    });
  }
  
  alert(message);
}

console.log('OPFS 文件上传助手已加载，请通过脚本菜单使用');
