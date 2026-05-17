// ==UserScript==
// @name         ScriptCat 自动生成描述助手
// @namespace    https://scriptcat.org/
// @version      0.4.0
// @description  在 ScriptCat 发布脚本时，自动根据脚本代码生成描述和更新日志
// @author       wuxia
// @match        https://scriptcat.org/zh-CN/scripts/create*
// @match        https://scriptcat.org/zh-CN/scripts/edit/*
// @match        https://scriptcat.org/zh-CN/script-show-page/*/update
// @grant        CAT.agent.conversation
// @run-at       document-idle
// @icon         
// ==/UserScript==

"use strict";

// ScriptCat 特有功能
// ScriptCat only

(async function() {
    console.log('ScriptCat 自动生成描述助手已加载');

    await waitForElement('.monaco-editor', 15000);

    createGenerateButtons();
})();

function createGenerateButtons() {
    if (document.getElementById('ai-desc-btn')) return;

    const insertButtons = () => {
        if (document.getElementById('ai-desc-btn')) return true;

        // 精确定位 submit 按钮
        const submitBtn = document.querySelector(
            '.ant-space-item > button[type="submit"]'
        );

        if (!submitBtn) {
            console.log('未找到 submit 按钮');
            return false;
        }

        // submit 外层 .ant-space-item
        const submitWrapper = submitBtn.closest('.ant-space-item');

        if (!submitWrapper || !submitWrapper.parentNode) {
            return false;
        }

        // 创建两个按钮
        const buttons = [
            { id: 'ai-desc-btn', text: '📝 AI 生成描述', handler: generateDescription },
            { id: 'ai-changelog-btn', text: '📋 AI 生成日志', handler: generateChangelog }
        ];

        buttons.forEach((btnConfig, index) => {
            // 创建 ant-space-item
            const aiWrapper = document.createElement('div');
            aiWrapper.className = 'ant-space-item';
            aiWrapper.id = `${btnConfig.id}-wrapper`;

            // 创建按钮
            const button = document.createElement('button');
            button.id = btnConfig.id;
            button.type = 'button';
            button.innerHTML = btnConfig.text;

            // Ant Design 按钮样式
            button.className =
                'ant-btn css-1enej14 light ant-btn-default ant-btn-color-default ant-btn-variant-outlined';
            
            if (index < buttons.length - 1) {
                button.style.marginRight = '8px';
            }

            button.addEventListener('click', btnConfig.handler);

            aiWrapper.appendChild(button);

            // 插入 submit 左边
            submitWrapper.parentNode.insertBefore(aiWrapper, submitWrapper);
        });

        console.log('AI 按钮插入成功');

        return true;
    };

    // 立即尝试
    if (insertButtons()) return;

    // React 异步渲染监听
    const observer = new MutationObserver(() => {
        if (insertButtons()) {
            observer.disconnect();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    setTimeout(() => {
        observer.disconnect();
    }, 20000);
}

async function generateDescription() {
    await generateContent('description');
}

async function generateChangelog() {
    await generateContent('changelog');
}

async function generateContent(type) {
    const buttonId = type === 'description' ? 'ai-desc-btn' : 'ai-changelog-btn';
    const button = document.getElementById(buttonId);
    
    try {
        button.textContent = type === 'description' ? '⏳ 生成描述中...' : '⏳ 生成日志中...';
        button.disabled = true;
        
        // 获取脚本代码
        const scriptCode = await getScriptCode();
        
        if (!scriptCode) {
            alert('请先输入脚本代码！');
            resetButton(button, type);
            return;
        }
        
        // 创建对话
        const conv = await CAT.agent.conversation.create({
            system: type === 'description' 
                ? "你是一个专业的脚本描述撰写助手。请根据提供的脚本代码，生成详细的功能描述（Markdown格式）。"
                : "你是一个专业的脚本更新日志撰写助手。请根据提供的脚本代码，生成更新日志（Markdown格式）。限制在500字以内。",
            ephemeral: true
        });
        
        // 生成内容
        const prompt = type === 'description'
            ? `请分析以下脚本代码，生成一个详细的脚本描述（包括功能介绍、使用方法等，Markdown格式）：

\`\`\`javascript
${scriptCode}
\`\`\`

只返回描述内容，不要其他格式标记。`
            : `请分析以下脚本代码，生成更新日志（Markdown格式）：

\`\`\`javascript
${scriptCode}
\`\`\`

只返回更新日志内容，不要其他格式标记。`;
        
        const reply = await conv.chat(prompt);
        

        // 在生成内容后，添加截断逻辑
        let content = typeof reply.content === 'string' ? reply.content.trim() : '';

        // 确保changelog不超过500字
        if (type === 'changelog' && content.length > 500) {
            content = content.substring(0, 497) + '...';
        }

        if (content) {
            if (type === 'description') {
                await setDescription(content);
            } else {
                await setChangelog(content);
            }
        }
        
        button.textContent = '✅ 生成完成';
        setTimeout(() => {
            resetButton(button, type);
        }, 2000);
        
    } catch (error) {
        console.error('生成内容时出错:', error);
        alert('生成内容时出错: ' + error.message);
        resetButton(button, type);
    }
}

function resetButton(button, type) {
    button.textContent = type === 'description' ? '📝 AI 生成描述' : '📋 AI 生成日志';
    button.disabled = false;
}

async function getScriptCode() {
    return new Promise((resolve) => {
        const pageWindow =
            typeof unsafeWindow !== 'undefined'
                ? unsafeWindow
                : window;

        const getValue = () => {
            const monaco = pageWindow.monaco;

            if (monaco && monaco.editor) {
                const models = monaco.editor.getModels();

                console.log('monaco models:', models.length);

                if (models.length > 0) {
                    // 优先取 javascript / userscript 文件
                    const model =
                        models.find(m => {
                            const uri = String(m.uri || '');
                            const lang = m.getLanguageId?.();
                            return uri.endsWith('.js') || lang === 'javascript';
                        }) || models[0];

                    return model.getValue();
                }
            }

            return '';
        };

        const first = getValue();
        if (first.trim()) {
            resolve(first);
            return;
        }

        let attempts = 0;

        const interval = setInterval(() => {
            const value = getValue();

            if (value.trim()) {
                clearInterval(interval);
                resolve(value);
                return;
            }

            attempts++;

            if (attempts > 20) {
                clearInterval(interval);
                resolve('');
            }
        }, 500);
    });
}

async function setDescription(text) {
    return new Promise((resolve) => {
        console.log('开始设置描述内容:', text.substring(0, 50) + '...');
        
        // 方法1: 直接操作ProseMirror
        const setProseMirrorContent = () => {
            // 先确保在Markdown编辑模式
            const markdownTab = document.querySelector('.toastui-editor-mode-switch .tab-item:first-child');
            if (markdownTab && !markdownTab.classList.contains('active')) {
                markdownTab.click();
            }
            
            // 找到Markdown模式的ProseMirror
            const proseMirror = document.querySelector('.toastui-editor-md-container .ProseMirror');
            
            if (proseMirror) {
                console.log('找到ProseMirror元素');
                
                // 简单的Markdown转HTML（处理基本格式）
                const html = markdownToSimpleHtml(text);
                
                // 设置内容
                proseMirror.innerHTML = html;
                
                // 触发各种事件让编辑器感知变化
                proseMirror.dispatchEvent(new Event('input', { bubbles: true }));
                proseMirror.dispatchEvent(new Event('change', { bubbles: true }));
                proseMirror.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
                proseMirror.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
                
                console.log('已设置ProseMirror内容');
                return true;
            }
            return false;
        };
        
        // 方法2: 尝试查找编辑器实例
        const findAndSetEditorInstance = () => {
            const editorEls = document.querySelectorAll('.toastui-editor, .theme-transition');
            for (const el of editorEls) {
                for (const key in el) {
                    try {
                        const obj = el[key];
                        if (obj && typeof obj === 'object' && typeof obj.setMarkdown === 'function') {
                            obj.setMarkdown(text);
                            console.log('通过编辑器实例setMarkdown成功');
                            return true;
                        }
                    } catch (e) {}
                }
            }
            return false;
        };
        
        // 方法3: 查找隐藏的textarea
        const findAndSetTextarea = () => {
            const textareas = document.querySelectorAll('.toastui-editor textarea');
            for (const textarea of textareas) {
                if (textarea.style.display !== 'none' || !textarea.offsetParent) {
                    setReactControlledValue(textarea, text);
                    console.log('通过隐藏textarea设置成功');
                    return true;
                }
            }
            return false;
        };
        
        // 依次尝试
        let success = false;
        
        // 先尝试直接操作ProseMirror
        success = setProseMirrorContent();
        
        if (!success) {
            // 尝试查找编辑器实例
            success = findAndSetEditorInstance();
        }
        
        if (!success) {
            // 尝试查找textarea
            success = findAndSetTextarea();
        }
        
        if (!success) {
            console.log('所有方法都失败了，尝试剪贴板方案');
            // 最后方案：提示用户手动粘贴
            copyToClipboard(text);
            alert('已将生成的内容复制到剪贴板，请手动粘贴到描述区域');
        }
        
        setTimeout(resolve, 500);
    });
}

// 专门处理React受控组件的值设置
function setReactControlledValue(element, value) {
    // 保存原始的value属性描述符
    const valueSetter = Object.getOwnPropertyDescriptor(element, 'value');
    const prototype = Object.getPrototypeOf(element);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value');
    
    // 优先使用原型上的setter
    if (prototypeValueSetter && prototypeValueSetter.set) {
        prototypeValueSetter.set.call(element, value);
    } else if (valueSetter && valueSetter.set) {
        valueSetter.set.call(element, value);
    } else {
        // 回退到直接赋值
        element.value = value;
    }
    
    // 触发input事件
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);
    
    // 也触发change事件
    const changeEvent = new Event('change', { bubbles: true });
    element.dispatchEvent(changeEvent);
    
    // 尝试查找并调用React的onChange
    const reactKey = Object.keys(element).find(key => 
        key.startsWith('__react') || key.startsWith('__reactFiber')
    );
    
    if (reactKey) {
        try {
            const fiber = element[reactKey];
            if (fiber && fiber.memoizedProps && fiber.memoizedProps.onChange) {
                const syntheticEvent = {
                    target: { value },
                    currentTarget: { value },
                    preventDefault: () => {},
                    stopPropagation: () => {}
                };
                fiber.memoizedProps.onChange(syntheticEvent);
            }
        } catch (e) {
            console.log('React onChange调用失败，但继续执行');
        }
    }
}

async function setChangelog(text) {
    return new Promise((resolve) => {
        console.log('开始设置更新日志内容:', text.substring(0, 50) + '...');
        
        const setChangelogContent = () => {
            const textarea = document.getElementById('changelog');
            
            if (!textarea) {
                console.log('未找到更新日志textarea');
                return false;
            }
            
            console.log('找到更新日志textarea，使用React兼容方式设置值');
            
            // 使用React兼容的方式设置值
            setReactControlledValue(textarea, text);
            
            console.log('更新日志内容已设置');
            return true;
        };
        
        let success = setChangelogContent();
        
        if (!success) {
            // 重试几次
            let attempts = 0;
            const interval = setInterval(() => {
                success = setChangelogContent();
                attempts++;
                if (success || attempts >= 3) {
                    clearInterval(interval);
                    if (!success) {
                        copyToClipboard(text);
                        alert('已将生成的更新日志复制到剪贴板，请手动粘贴');
                    }
                    resolve();
                }
            }, 300);
        } else {
            resolve();
        }
    });
}

// 简单的Markdown转HTML，只处理基本格式
function markdownToSimpleHtml(md) {
    return md
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/^\s*[-*+]\s(.*$)/gm, '<li>$1</li>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[h|l])(.*)$/gm, '<p>$1</p>');
}

// 复制到剪贴板
function copyToClipboard(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
    } catch (e) {
        console.error('复制失败:', e);
    }
    document.body.removeChild(textarea);
}

function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve) => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }
        
        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, timeout);
    });
}
