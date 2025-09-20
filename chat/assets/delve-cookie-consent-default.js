(function(f,s){"use strict";class g{static originalCreateElement=null;static originalCookieDescriptor=null;static blockedCookies=new Set;static enabledCategories=new Set(["necessary"]);static init(){this.interceptScripts(),this.interceptCookies()}static interceptScripts(){this.originalCreateElement||(this.originalCreateElement=s.createElement,s.createElement=function(t){const n=g.originalCreateElement.call(this,t);if(t.toLowerCase()==="script"){const r=Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype,"src")?.set;r&&Object.defineProperty(n,"src",{set:function(i){const l=this.dataset.category;l&&!g.enabledCategories.has(l)||r.call(this,i)},get:function(){return this.getAttribute("src")}})}return n})}static interceptCookies(){this.originalCookieDescriptor||(this.originalCookieDescriptor=Object.getOwnPropertyDescriptor(Document.prototype,"cookie"),Object.defineProperty(s,"cookie",{get:this.originalCookieDescriptor.get,set:function(t){const n=t.split("=")[0].trim(),r=g.getCookieCategory(n);r&&!g.enabledCategories.has(r)||g.originalCookieDescriptor.set.call(this,t)}}))}static getCookieCategory(t){for(const[n,r]of Object.entries(o.categories))if(r.cookies){for(const i of r.cookies)if(i instanceof RegExp&&i.test(t)||typeof i=="string"&&i===t)return n}return null}static updateConsent(t){this.enabledCategories=new Set(Object.keys(t).filter(n=>t[n].enabled)),this.processScriptTags(t),this.clearCookiesForDisabledCategories(t)}static processScriptTags(t){s.querySelectorAll("script[data-category]").forEach(r=>{const i=r.dataset.category,l=i.startsWith("!"),u=l?i.slice(1):i,d=t[u]?.enabled;if((l?!d:d)&&r.type==="text/plain"){const b=s.createElement("script");Array.from(r.attributes).forEach(v=>{v.name!=="type"&&b.setAttribute(v.name,v.value)});const h=r.dataset.type;b.type=h||"text/javascript",r.src||r.dataset.src?b.src=r.src||r.dataset.src:b.textContent=r.textContent,r.parentNode?.replaceChild(b,r)}})}static clearCookiesForDisabledCategories(t){Object.keys(t).forEach(n=>{const r=t[n];!r.enabled&&r.cookies&&r.cookies.forEach(i=>{this.clearCookiesByPattern(i)})})}static clearCookiesByPattern(t){s.cookie.split(";").forEach(r=>{const i=r.split("=")[0].trim();let l=!1;t instanceof RegExp?l=t.test(i):typeof t=="string"&&(l=t===i),l&&this.deleteCookie(i)})}static deleteCookie(t,n="",r="/"){const i=n?`; domain=${n}`:"",l=r?`; path=${r}`:"";if(s.cookie=`${t}=; expires=Thu, 01 Jan 1970 00:00:00 UTC${l}${i}`,!n){const u=f.location.hostname;s.cookie=`${t}=; expires=Thu, 01 Jan 1970 00:00:00 UTC${l}; domain=${u}`,s.cookie=`${t}=; expires=Thu, 01 Jan 1970 00:00:00 UTC${l}; domain=.${u}`}}}const O=`
        .delve-cookie-banner * {
            box-sizing: border-box;
        }
        
        .delve-cookie-banner {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%) translateY(100px);
            background: #FFFFFF;
            border: 1px solid #E5E7EB;
            border-radius: 50px;
            padding: 12px 20px;
            max-width: 900px;
            width: calc(100vw - 40px);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            color: #374151;
            z-index: 999999;
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            backdrop-filter: blur(8px);
            overflow: hidden;
            will-change: transform, opacity;
            /* Reset properties to prevent inheritance */
            margin: 0;
            line-height: 1.4;
            font-size: 14px;
            text-align: left;
            vertical-align: baseline;
            direction: ltr;
            letter-spacing: normal;
            word-spacing: normal;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-cookie-banner {
                background: #1F2937;
                border: 1px solid #374151;
                color: #F9FAFB;
            }
        }
        
        .delve-cookie-banner.show {
            transform: translateX(-50%) translateY(0);
        }
        
        .delve-cookie-banner.hiding {
            transform: translateX(-50%) translateY(120px);
            opacity: 0;
            pointer-events: none;
            visibility: hidden;
        }
        
        .delve-banner-content {
            display: flex;
            align-items: center;
            gap: 16px;
            flex-wrap: nowrap;
        }
        
        .delve-banner-icon {
            flex-shrink: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .delve-banner-icon svg {
            width: 20px;
            height: 20px;
            fill: #6B7280;
            stroke: #6B7280;
            stroke-width: 2;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-banner-icon svg {
                fill: #9CA3AF;
                stroke: #9CA3AF;
            }
        }
        
        .delve-banner-text {
            flex: 1;
            min-width: 200px;
        }
        
        .delve-banner-title {
            display: none;
        }
        
        .delve-banner-message {
            font-size: 14px;
            line-height: 1.3;
            margin: 0 0 4px 0;
            color: #6B7280;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-banner-message {
                color: #D1D5DB;
            }
        }
        
        .delve-privacy-link {
            font-size: 12px;
            color: #3B82F6;
            text-decoration: none;
            margin: 0;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-privacy-link {
                color: #60A5FA;
            }
        }
        
        .delve-privacy-link:hover {
            text-decoration: underline;
        }
        
        .delve-banner-actions {
            display: flex;
            gap: 6px;
            flex-wrap: nowrap;
            flex-shrink: 0;
        }
        
        .delve-banner-footer {
            border-top: 1px solid #F3F4F6;
            padding: 4px 20px;
            text-align: center;
            background: rgba(249, 250, 251, 0.8);
            margin: 6px -20px -12px -20px;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-banner-footer {
                border-top: 1px solid #374151;
                background: rgba(31, 41, 55, 0.8);
            }
        }
        
        .delve-banner-brand {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
        }
        
        .delve-banner-brand-text {
            font-size: 9px;
            color: #D1D5DB;
        }
        
        .delve-banner-brand-logo {
            width: 60px;
            height: 18px;
            flex-shrink: 0;
            display: inline-block;
            vertical-align: middle;
            margin-left: 1px;
            margin-top: -3px;
        }
        
        .delve-banner-brand-logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            vertical-align: middle;
        }
        
        .delve-banner-brand-logo svg {
            width: 60px;
            height: 18px;
            fill: currentColor;
            vertical-align: middle;
        }
        
        .delve-banner-brand-link {
            color: #3B82F6;
            text-decoration: none;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-banner-brand-link {
                color: #60A5FA;
            }
        }
        
        .delve-banner-brand-link:hover {
            text-decoration: underline;
        }
        
        /* Auto-accept progress bar */
        .delve-auto-accept-progress {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: rgba(0, 0, 0, 0.1);
            border-radius: 0 0 50px 50px;
            overflow: hidden;
            opacity: 0;
            transition: opacity 0.3s ease;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-auto-accept-progress {
                background: rgba(255, 255, 255, 0.1);
            }
        }
        
        .delve-auto-accept-progress.show {
            opacity: 1;
        }
        
        .delve-auto-accept-progress-bar {
            height: 100%;
            background: #3B82F6;
            width: 0%;
            transition: width linear;
            border-radius: 0 0 50px 50px;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-auto-accept-progress-bar {
                background: #60A5FA;
            }
        }
        
        .delve-btn {
            padding: 6px 14px;
            border: none;
            border-radius: 16px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            white-space: nowrap;
            min-height: 32px;
        }
        
        .delve-btn-primary {
            background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
            color: white;
            border: 1px solid transparent;
            padding: 8px 20px;
        }
        
        .delve-btn-primary:hover {
            background: linear-gradient(135deg, #2563EB 0%, #1E40AF 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-btn-primary {
                background: #F9FAFB;
                color: #1F2937;
            }
            
            .delve-btn-primary:hover {
                background: #E5E7EB;
                color: #111827;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(249, 250, 251, 0.3);
            }
        }
        
        .delve-btn-secondary {
            background: #F9FAFB;
            color: #6B7280;
            border: 1px solid #E5E7EB;
            padding: 8px 16px;
        }
        
        .delve-btn-secondary:hover {
            background: #F3F4F6;
            color: #374151;
            border-color: #D1D5DB;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-btn-secondary {
                background: #374151;
                color: #D1D5DB;
                border: 1px solid #4B5563;
            }
            
            .delve-btn-secondary:hover {
                background: #4B5563;
                color: #F9FAFB;
                border-color: #6B7280;
            }
        }
        
        .delve-btn-tertiary {
            background: transparent;
            color: #3B82F6;
            border: 1px solid #E5E7EB;
            padding: 8px 16px;
        }
        
        .delve-btn-tertiary:hover {
            background: #EFF6FF;
            color: #1D4ED8;
            border-color: #BFDBFE;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-btn-tertiary {
                background: transparent;
                color: #60A5FA;
                border: 1px solid #4B5563;
            }
            
            .delve-btn-tertiary:hover {
                background: #1E3A8A;
                color: #BFDBFE;
                border-color: #60A5FA;
            }
        }
        
        .delve-preferences-link {
            font-size: 14px;
            color: #6B7280;
            text-decoration: underline;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-left: 2px;
            white-space: nowrap;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-preferences-link {
                color: #D1D5DB;
            }
        }
        
        .delve-preferences-link:hover {
            color: #374151;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-preferences-link:hover {
                color: #F9FAFB;
            }
        }
        
        /* Settings Modal */
        .delve-settings-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.4);
            z-index: 1000000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 20px;
            backdrop-filter: blur(4px);
            overflow: hidden;
            touch-action: none;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-settings-overlay {
                background: rgba(0, 0, 0, 0.7);
            }
        }
        
        .delve-settings-modal {
            background: #FFFFFF;
            border: 1px solid #E5E7EB;
            border-radius: 20px;
            max-width: 750px;
            width: 100%;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            position: relative;
            overflow: hidden;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-settings-modal {
                background: #1F2937;
                border: 1px solid #374151;
                color: #F9FAFB;
            }
        }
        
        .delve-settings-content {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            -webkit-overflow-scrolling: touch;
            overscroll-behavior: contain;
            touch-action: pan-y;
        }
        
        .delve-settings-header {
            padding: 24px 24px 16px 24px;
            border-bottom: 1px solid #F3F4F6;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-settings-header {
                border-bottom: 1px solid #374151;
            }
        }
        
        .delve-settings-title {
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 8px 0;
            color: #111827;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-settings-title {
                color: #F9FAFB;
            }
        }
        
        .delve-settings-subtitle {
            font-size: 14px;
            color: #6B7280;
            margin: 0;
            line-height: 1.4;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-settings-subtitle {
                color: #D1D5DB;
            }
        }
        
        .delve-settings-privacy {
            margin: 12px 0 0 0;
            font-size: 13px;
        }
        
        .delve-settings-privacy a {
            color: #3B82F6;
            text-decoration: none;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-settings-privacy a {
                color: #60A5FA;
            }
        }
        
        .delve-settings-privacy a:hover {
            text-decoration: underline;
        }
        
        .delve-category {
            padding: 20px 24px;
            border-bottom: 1px solid #F3F4F6;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-category {
                border-bottom: 1px solid #374151;
            }
        }
        
        .delve-category:last-child {
            border-bottom: none;
        }
        
        .delve-category-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .delve-category-name {
            font-size: 15px;
            font-weight: 500;
            color: #111827;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-category-name {
                color: #F9FAFB;
            }
        }
        
        .delve-toggle {
            position: relative;
            width: 44px;
            height: 24px;
            background: #E5E7EB;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        
        .delve-toggle.enabled {
            background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%);
        }
        
        .delve-toggle.disabled-permanent {
            background: #F3F4F6;
            cursor: not-allowed;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-toggle {
                background: #4B5563;
            }
            
            .delve-toggle.enabled {
                background: linear-gradient(135deg, #60A5FA 0%, #3B82F6 100%);
            }
            
            .delve-toggle.disabled-permanent {
                background: #374151;
                cursor: not-allowed;
            }
        }
        
        .delve-toggle-thumb {
            position: absolute;
            top: 2px;
            left: 2px;
            width: 20px;
            height: 20px;
            background: white;
            border-radius: 50%;
            transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), box-shadow 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            will-change: transform;
        }
        
        .delve-toggle.enabled .delve-toggle-thumb {
            transform: translateX(20px);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
        }
        
        .delve-category-description {
            font-size: 13px;
            color: #6B7280;
            line-height: 1.4;
            margin-bottom: 16px;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-category-description {
                color: #9CA3AF;
            }
        }
        
        .delve-cookie-table {
            margin-top: 16px;
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        
        .delve-cookie-table th,
        .delve-cookie-table td {
            padding: 8px 12px;
            text-align: left;
            border-bottom: 1px solid #F3F4F6;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-cookie-table th,
            .delve-cookie-table td {
                border-bottom: 1px solid #374151;
            }
        }
        
        .delve-cookie-table th {
            background: #F9FAFB;
            font-weight: 500;
            color: #374151;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-cookie-table th {
                background: #374151;
                color: #F9FAFB;
            }
        }
        
        .delve-cookie-table td {
            color: #6B7280;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-cookie-table td {
                color: #9CA3AF;
            }
        }
        
        .delve-settings-actions {
            padding: 16px 24px 20px 24px;
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            border-top: 1px solid #F3F4F6;
            background: #FFFFFF;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-settings-actions {
                border-top: 1px solid #374151;
                background: #1F2937;
            }
        }
        
        .delve-settings-footer {
            padding: 12px 24px;
            border-top: 1px solid #E5E7EB;
            background: #F9FAFB;
            text-align: center;
            border-radius: 0 0 20px 20px;
            flex-shrink: 0;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-settings-footer {
                border-top: 1px solid #374151;
                background: #111827;
            }
        }
        
        .delve-settings-brand {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        
        .delve-settings-brand-text {
            font-size: 11px;
            color: #9CA3AF;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-settings-brand-text {
                color: #6B7280;
            }
        }
        
        .delve-brand-footer {
            padding: 16px 24px;
            border-top: 1px solid #F3F4F6;
            background: #F9FAFB;
            text-align: center;
            border-radius: 0 0 20px 20px;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-brand-footer {
                border-top: 1px solid #374151;
                background: #111827;
            }
        }
        
        .delve-brand-content {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .delve-brand-logo {
            width: 80px;
            height: 24px;
            flex-shrink: 0;
            display: inline-block;
            vertical-align: middle;
            margin-left: 2px;
            margin-bottom: 1px;
        }
        
        .delve-brand-logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            vertical-align: middle;
        }
        
        .delve-brand-logo svg {
            width: 80px;
            height: 24px;
            fill: currentColor;
            vertical-align: middle;
        }
        
        .delve-brand-text {
            font-size: 12px;
            color: #9CA3AF;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-brand-text {
                color: #6B7280;
            }
        }
        
        .delve-brand-link {
            color: #3B82F6;
            text-decoration: none;
        }
        
        @media (prefers-color-scheme: dark) {
            .delve-brand-link {
                color: #60A5FA;
            }
        }
        
        .delve-brand-link:hover {
            text-decoration: underline;
        }
        
        @media (max-width: 768px) {
            .delve-cookie-banner {
                bottom: 12px;
                left: 12px;
                right: 12px;
                transform: translateX(0) translateY(100px);
                max-width: none;
                width: auto;
                border-radius: 20px;
                padding: 16px 20px;
                will-change: transform, opacity;
            }
            
            .delve-auto-accept-progress {
                border-radius: 0 0 20px 20px;
            }
            
            .delve-auto-accept-progress-bar {
                border-radius: 0 0 20px 20px;
            }
            
            .delve-cookie-banner.show {
                transform: translateX(0) translateY(0);
            }
            
            .delve-cookie-banner.hiding {
                transform: translateX(0) translateY(120px);
                opacity: 0;
                pointer-events: none;
                visibility: hidden;
            }
            
            .delve-banner-content {
                gap: 16px;
                flex-direction: column;
                align-items: stretch;
            }
            
            .delve-banner-icon {
                align-self: center;
            }
            
            .delve-banner-text {
                min-width: 0;
                flex: 1;
                text-align: center;
                width: 100%;
                max-width: 100%;
            }
            
            .delve-banner-message {
                font-size: 14px;
                line-height: 1.4;
                margin: 0;
                word-wrap: break-word;
                overflow-wrap: break-word;
                hyphens: auto;
                width: 100%;
            }
            
            .delve-banner-actions {
                gap: 8px;
                flex-direction: column;
                flex-shrink: 0;
                width: 100%;
            }
            
            .delve-btn {
                padding: 12px 16px;
                font-size: 14px;
                min-height: 44px;
                border-radius: 12px;
                width: 100%;
                font-weight: 600;
                box-sizing: border-box;
            }
            
            .delve-btn-primary {
                order: -1;
            }
            
            .delve-preferences-link {
                font-size: 14px;
                margin-left: 2px;
                white-space: nowrap;
                color: #6B7280;
                text-decoration: underline;
                display: block;
            }
            
            @media (prefers-color-scheme: dark) {
                .delve-preferences-link {
                    color: #D1D5DB;
                }
            }
            
            .delve-settings-modal {
                margin: 16px;
                max-height: calc(100vh - 32px);
                border-radius: 16px;
                width: calc(100vw - 32px);
                max-width: calc(100vw - 32px);
            }
            
            .delve-settings-header {
                padding: 24px 20px 16px 20px;
            }
            
            .delve-settings-title {
                font-size: 18px;
                margin-bottom: 12px;
            }
            
            .delve-settings-subtitle {
                font-size: 14px;
                line-height: 1.5;
            }
            
            .delve-settings-privacy {
                margin: 16px 0 0 0;
                font-size: 13px;
                text-align: center;
            }
            
            .delve-category {
                padding: 20px;
                border-bottom: 1px solid #F3F4F6;
            }
            
            .delve-category-header {
                margin-bottom: 12px;
            }
            
            .delve-category-name {
                font-size: 16px;
                font-weight: 600;
            }
            
            .delve-category-description {
                font-size: 14px;
                line-height: 1.5;
                margin-bottom: 20px;
            }
            
            .delve-toggle {
                width: 52px;
                height: 28px;
                border-radius: 14px;
            }
            
            .delve-toggle-thumb {
                top: 2px;
                left: 2px;
                width: 24px;
                height: 24px;
            }
            
            .delve-toggle.enabled .delve-toggle-thumb {
                transform: translateX(24px);
            }
            
            .delve-settings-actions {
                padding: 16px 20px 20px 20px;
                flex-direction: column;
                gap: 12px;
            }
            
            .delve-settings-actions .delve-btn {
                width: 100%;
                padding: 14px 20px;
                font-size: 15px;
                min-height: 48px;
                font-weight: 600;
            }
            
            .delve-settings-actions .delve-btn-primary {
                order: -1;
            }
            
            .delve-cookie-table {
                font-size: 11px;
                margin-top: 12px;
            }
            
            .delve-cookie-table th,
            .delve-cookie-table td {
                padding: 6px 8px;
            }
            
            .delve-brand-footer {
                border-radius: 0 0 12px 12px;
                padding: 8px 20px;
                margin: 8px -20px -16px -20px;
            }
            
            .delve-banner-footer {
                border-radius: 0 0 12px 12px;
                padding: 8px 20px;
                margin: 8px -20px -16px -20px;
            }
            
            .delve-banner-brand-text {
                font-size: 10px;
            }
            
            .delve-settings-footer {
                border-radius: 0 0 16px 16px;
                padding: 12px 20px;
            }
            
            .delve-settings-brand-text {
                font-size: 12px;
            }
        }
    `,w={message:"We use cookies to enhance your development experience and keep your data secure.",acceptText:"Accept all cookies",rejectText:"Reject non-essential",settingsText:"Cookie preferences",privacyPolicyText:"View Privacy Policy",privacyPolicyUrl:null,cookieName:"delve_cookie_consent",expiryDays:365,showRejectButton:!0,showSettingsButton:!0,preferencesDisplayMode:"button",autoShow:!0,manageScriptTags:!0,ccpaEnabled:!1,showInNonRegulatedRegions:!1,defaultCookieTableHeaders:{name:"Cookie Name",purpose:"Purpose",duration:"Duration"},categories:{},customStyles:{fontFamily:null,fontSize:null,primaryColor:null,primaryColorDark:null,textColor:null,backgroundColor:null,borderColor:null,footerBackgroundColor:null,footerTextColor:null,darkModeTextColor:null,darkModeBackgroundColor:null,darkModeBorderColor:null,darkModeFooterBackgroundColor:null,darkModeFooterTextColor:null,borderRadius:null,bannerMaxWidth:null,bannerPadding:null,buttonPadding:null,boxShadow:null,backdropFilter:null,invertLogo:null,customCSS:null},onAccept:function(e){},onReject:function(){},onChange:function(e){}},A={necessary:{name:"Essential",description:"Required for basic site functionality and security.",required:!0},analytics:{name:"Analytics",description:"Help us understand how users interact with our platform.",required:!1},marketing:{name:"Marketing",description:"Used for advertising and measuring campaign effectiveness.",required:!1},preferences:{name:"Preferences",description:"Remember your settings and preferences.",required:!1}};let o={...w},a=null,p=null,T=!1;const E={API_ENDPOINT:"https://cdn.delve.co/api/geo",CACHE_DURATION:36e5,async detect(){const e=this.getCached();if(e)return e;try{const t=await fetch(this.API_ENDPOINT,{method:"GET",credentials:"omit"});if(!t.ok)throw new Error(`Geo API returned ${t.status}`);const n=await t.json();return this.cache(n),n}catch{return{requiresConsent:!0,error:!0,country:"XX",consentType:"gdpr"}}},getCached(){try{const e=sessionStorage.getItem("delve_geo_data");if(!e)return null;const{data:t,timestamp:n}=JSON.parse(e);return Date.now()-n>this.CACHE_DURATION?(sessionStorage.removeItem("delve_geo_data"),null):t}catch{return null}},cache(e){try{sessionStorage.setItem("delve_geo_data",JSON.stringify({data:e,timestamp:Date.now()}))}catch{}}},m={storageKey:"delve_cookie_consent",save(e){const t={timestamp:new Date().toISOString(),categories:e,version:"3.0.0"};try{return localStorage.setItem(this.storageKey,JSON.stringify(t)),F(o.cookieName,"",-1),!0}catch{return F(o.cookieName,encodeURIComponent(JSON.stringify(t)),o.expiryDays),!0}},get(){try{const t=localStorage.getItem(this.storageKey);if(t){const n=JSON.parse(t);if(n.categories&&n.timestamp)return n}}catch{}const e=x(o.cookieName);if(!e)return null;try{return JSON.parse(decodeURIComponent(e))}catch{return null}},exists(){try{if(localStorage.getItem(this.storageKey))return!0}catch{}return x(o.cookieName)!==null},remove(){try{localStorage.removeItem(this.storageKey)}catch{}F(o.cookieName,"",-1)},migrate(){try{const e=x(o.cookieName);if(e&&!localStorage.getItem(this.storageKey)){const t=JSON.parse(decodeURIComponent(e));t.categories&&localStorage.setItem(this.storageKey,JSON.stringify({...t,version:"3.0.0",migrated:!0}))}}catch{}}};function F(e,t,n){const r=new Date;r.setTime(r.getTime()+n*24*60*60*1e3),s.cookie=`${e}=${t};expires=${r.toUTCString()};path=/;SameSite=Lax`}function x(e){const t=e+"=",n=s.cookie.split(";");for(let r=0;r<n.length;r++){let i=n[r];for(;i.charAt(0)===" ";)i=i.substring(1,i.length);if(i.indexOf(t)===0)return i.substring(t.length,i.length)}return null}function H(){return m.exists()}function B(){return m.get()}function C(e){m.save(e)}function P(){const e=o.customStyles;if(!e||Object.values(e).every(n=>n===null))return"";let t=`
/* Custom Styles */
`;return e.fontFamily&&(t+=`.delve-cookie-banner,
.delve-settings-modal {
    font-family: ${e.fontFamily} !important;
}
`),e.fontSize&&(t+=`.delve-banner-message,
.delve-btn,
.delve-category-description,
.delve-settings-subtitle {
    font-size: ${e.fontSize} !important;
}
`),e.primaryColor&&(t+=`.delve-btn-primary {
    background: ${e.primaryColor} !important;
    border-color: ${e.primaryColor} !important;
}
.delve-btn-primary:hover {
    background: ${e.primaryColorDark||e.primaryColor} !important;
    border-color: ${e.primaryColorDark||e.primaryColor} !important;
}
.delve-toggle.enabled {
    background: ${e.primaryColor} !important;
}
.delve-auto-accept-progress-bar {
    background: ${e.primaryColor} !important;
}
.delve-privacy-link,
.delve-banner-brand-link,
.delve-brand-link,
.delve-btn-tertiary {
    color: ${e.primaryColor} !important;
}
`),e.textColor&&(t+=`.delve-cookie-banner,
.delve-settings-modal,
.delve-banner-message,
.delve-category-name,
.delve-settings-title {
    color: ${e.textColor} !important;
}
`),e.backgroundColor&&(t+=`.delve-cookie-banner,
.delve-settings-modal {
    background: ${e.backgroundColor} !important;
}
`),e.borderColor&&(t+=`.delve-cookie-banner,
.delve-settings-modal,
.delve-btn-secondary,
.delve-btn-tertiary,
.delve-category,
.delve-settings-header,
.delve-settings-actions {
    border-color: ${e.borderColor} !important;
}
`),e.footerBackgroundColor&&(t+=`.delve-banner-footer,
.delve-settings-footer,
.delve-brand-footer {
    background: ${e.footerBackgroundColor} !important;
}
`),e.footerTextColor&&(t+=`.delve-banner-brand-text,
.delve-settings-brand-text,
.delve-brand-text {
    color: ${e.footerTextColor} !important;
}
.delve-banner-brand-link,
.delve-brand-link {
    color: ${e.footerTextColor} !important;
    opacity: 0.8;
}
`),(e.darkModeTextColor||e.darkModeBackgroundColor||e.darkModeBorderColor||e.darkModeFooterBackgroundColor||e.darkModeFooterTextColor)&&(t+=`@media (prefers-color-scheme: dark) {
`,e.darkModeTextColor&&(t+=`    .delve-cookie-banner,
    .delve-settings-modal,
    .delve-banner-message,
    .delve-category-name,
    .delve-settings-title {
        color: ${e.darkModeTextColor} !important;
    }
`),e.darkModeBackgroundColor&&(t+=`    .delve-cookie-banner,
    .delve-settings-modal {
        background: ${e.darkModeBackgroundColor} !important;
    }
`),e.darkModeBorderColor&&(t+=`    .delve-cookie-banner,
    .delve-settings-modal,
    .delve-btn-secondary,
    .delve-btn-tertiary,
    .delve-category,
    .delve-settings-header,
    .delve-settings-actions {
        border-color: ${e.darkModeBorderColor} !important;
    }
`),e.darkModeFooterBackgroundColor&&(t+=`    .delve-banner-footer,
    .delve-settings-footer,
    .delve-brand-footer {
        background: ${e.darkModeFooterBackgroundColor} !important;
    }
`),e.darkModeFooterTextColor&&(t+=`    .delve-banner-brand-text,
    .delve-settings-brand-text,
    .delve-brand-text {
        color: ${e.darkModeFooterTextColor} !important;
    }
    .delve-banner-brand-link,
    .delve-brand-link {
        color: ${e.darkModeFooterTextColor} !important;
        opacity: 0.8;
    }
`),t+=`}
`),e.borderRadius&&(t+=`.delve-cookie-banner {
    border-radius: ${e.borderRadius} !important;
}
.delve-settings-modal {
    border-radius: ${e.borderRadius} !important;
}
.delve-btn {
    border-radius: calc(${e.borderRadius} / 2) !important;
}
`),e.bannerMaxWidth&&(t+=`.delve-cookie-banner {
    max-width: ${e.bannerMaxWidth} !important;
}
`),e.bannerPadding&&(t+=`.delve-cookie-banner {
    padding: ${e.bannerPadding} !important;
}
`),e.buttonPadding&&(t+=`.delve-btn {
    padding: ${e.buttonPadding} !important;
}
`),e.boxShadow&&(t+=`.delve-cookie-banner,
.delve-settings-modal {
    box-shadow: ${e.boxShadow} !important;
}
`),e.backdropFilter&&(t+=`.delve-cookie-banner {
    backdrop-filter: ${e.backdropFilter} !important;
}
.delve-settings-overlay {
    backdrop-filter: ${e.backdropFilter} !important;
}
`),e.customCSS&&(t+=`
/* User Custom CSS */
${e.customCSS}
`),t}function z(){if(s.getElementById("delve-cookie-styles"))return;const e=s.createElement("style");e.id="delve-cookie-styles",e.textContent=O+P(),s.head.appendChild(e)}function N(e=!1){let t=e;return o.customStyles&&o.customStyles.invertLogo===!0&&(t=!e),t?`<svg width="116" height="24" viewBox="0 0 116 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
            <path d="M24.2615 2.29137C24.2615 1.03764 23.366 0.174681 22.1122 0.174681C18.9698 0.174681 15.8273 0.174681 12.6848 0.174681C9.54237 0.174681 6.56272 0.23981 3.50166 0.142117C1.61292 0.0932701 0.847656 1.24931 0.847656 2.82868C0.880221 5.90602 0.847656 8.98336 0.847656 12.077C0.847656 15.1706 0.847656 17.9712 0.847656 20.9182C0.847656 22.3674 1.71061 23.3769 2.96435 23.3769C9.36326 23.3769 15.7622 23.3769 22.1448 23.3769C23.3497 23.3769 24.2452 22.4813 24.2452 21.2764C24.2452 14.9589 24.2452 8.62516 24.2452 2.30765L24.2615 2.29137ZM3.69705 8.99965C4.28321 7.90874 4.95078 6.86668 5.65091 5.8409C6.15566 5.09191 7.1326 4.92909 7.88158 5.38499C8.66313 5.8409 8.95621 6.81783 8.5003 7.63194C7.89786 8.69028 7.24657 9.69978 6.59528 10.7256C6.28592 11.214 5.79745 11.442 5.22757 11.442C3.94128 11.442 3.0946 10.1394 3.69705 8.99965ZM7.00234 20.153C5.63463 20.153 4.85308 18.7853 5.55322 17.5641C6.54643 15.8707 7.60478 14.1937 8.63056 12.5166C10.4053 9.61837 12.1801 6.72014 13.9548 3.8219C14.3782 3.13805 14.8829 2.60073 15.7459 2.64958C17.081 2.73099 17.7649 4.11498 17.0159 5.35243C15.4528 7.97387 13.8409 10.5627 12.2452 13.1516C11.0403 15.138 9.81916 17.1082 8.61428 19.0946C8.23979 19.7134 7.7676 20.1367 7.00234 20.153ZM21.2656 10.7256C20.3863 12.2398 19.442 13.7215 18.5302 15.2195C17.5207 16.8477 16.5274 18.4922 15.5179 20.1041C14.8504 21.1788 13.906 21.4718 13.0105 20.902C12.1475 20.3646 11.9847 19.3714 12.6034 18.3456C14.4922 15.2683 16.3809 12.191 18.2696 9.09734C18.6441 8.47862 19.1326 8.05528 19.8979 8.07156C21.2493 8.07156 21.9983 9.47183 21.2819 10.7093L21.2656 10.7256Z" fill="white"/>
            <path d="M78.9557 6.28113H84.0032C85.1918 10.368 86.3804 14.4222 87.569 18.4928C87.6342 18.4928 87.6993 18.4928 87.7644 18.4928C88.953 14.4222 90.1416 10.368 91.3139 6.29741H96.3777C94.3587 12.0613 92.356 17.7438 90.3859 23.41H84.9313C82.9449 17.7275 80.9584 12.0613 78.9395 6.28113H78.9557Z" fill="white"/>
            <path d="M73.3242 0.455078H77.9158V23.3805H73.3242V0.455078Z" fill="white"/>
            <path d="M53.6811 9.19882C53.1927 6.46341 51.9878 4.10248 49.6594 2.40913C47.9335 1.17168 45.9796 0.520395 43.9118 0.455266C40.7856 0.34129 37.6431 0.422701 34.4355 0.422701V23.3806C34.6147 23.4132 34.7449 23.4458 34.8752 23.4458C38.1153 23.3969 41.3718 23.5109 44.6119 23.2504C48.7639 22.9247 51.6296 20.6778 53.1113 16.7701C54.0393 14.3114 54.1533 11.7551 53.6974 9.19882H53.6811ZM48.6988 14.6696C48.0638 17.3074 46.3053 18.8705 43.5862 19.0658C42.1859 19.1635 40.7856 19.0821 39.3039 19.0821V4.47697C41.9091 4.59095 44.6608 3.82569 46.8426 5.79584C47.673 6.54482 48.2917 7.68457 48.6336 8.7592C49.2524 10.6805 49.171 12.6832 48.6988 14.6696Z" fill="white"/>
            <path d="M106.667 15.9896H112.577C112.708 13.6449 112.48 11.5283 111.356 9.59068C110.021 7.31116 107.904 6.22025 105.348 5.9923C102.303 5.73179 99.6167 6.57846 97.7768 9.13477C96.002 11.5934 95.7089 14.4102 96.2788 17.3247C96.6045 19.0018 97.3046 20.5649 98.6072 21.6884C101.782 24.4238 106.699 24.5866 110.135 22.1768C111.242 21.4279 112.17 20.0927 112.447 18.4971C110.949 18.4156 109.549 18.3342 108.165 18.2528C106.862 20.3532 104.811 20.4835 103.199 19.9625C101.587 19.4414 100.708 17.9597 100.854 16.0059H106.651L106.667 15.9896ZM104.778 9.49298C106.667 9.57439 108.181 11.2189 107.986 13.0262H100.887C100.887 10.9584 102.613 9.39529 104.778 9.49298Z" fill="white"/>
            <path d="M71.6232 13.8412C71.4278 10.5522 70.1089 8.01217 66.9664 6.59562C63.3843 4.98368 58.7602 6.25369 56.5947 9.51014C55.113 11.7408 54.999 14.232 55.2758 16.7557C55.4549 18.4165 56.0736 19.9308 57.2297 21.2008C59.3626 23.5454 62.1306 24.0013 65.094 23.7408C67.1455 23.5617 68.9529 22.7313 70.3043 21.1194C70.923 20.3704 71.3789 19.3772 71.4278 18.4979C69.9624 18.4165 68.5621 18.3351 67.2107 18.2537C65.9732 20.4681 63.482 20.5983 61.7887 19.7679C60.3559 19.0678 59.7371 17.2768 60.0791 15.9905H71.5092C71.558 15.7788 71.5906 15.7137 71.5906 15.6323C71.5906 15.0298 71.6232 14.4437 71.5906 13.8575L71.6232 13.8412ZM67.0967 13.0108H60.0139C59.6883 11.5943 61.3165 9.70553 63.2378 9.49386C65.2242 9.28219 67.2758 10.9267 67.0967 13.0108Z" fill="white"/>
          </svg>`:`<svg width="116" height="24" viewBox="0 0 116 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M24.2615 2.29137C24.2615 1.03764 23.366 0.174681 22.1122 0.174681C18.9698 0.174681 15.8273 0.174681 12.6848 0.174681C9.54237 0.174681 6.56272 0.23981 3.50166 0.142117C1.61292 0.0932701 0.847656 1.24931 0.847656 2.82868C0.880221 5.90602 0.847656 8.98336 0.847656 12.077C0.847656 15.1706 0.847656 17.9712 0.847656 20.9182C0.847656 22.3674 1.71061 23.3769 2.96435 23.3769C9.36326 23.3769 15.7622 23.3769 22.1448 23.3769C23.3497 23.3769 24.2452 22.4813 24.2452 21.2764C24.2452 14.9589 24.2452 8.62516 24.2452 2.30765L24.2615 2.29137ZM3.69705 8.99965C4.28321 7.90874 4.95078 6.86668 5.65091 5.8409C6.15566 5.09191 7.1326 4.92909 7.88158 5.38499C8.66313 5.8409 8.95621 6.81783 8.5003 7.63194C7.89786 8.69028 7.24657 9.69978 6.59528 10.7256C6.28592 11.214 5.79745 11.442 5.22757 11.442C3.94128 11.442 3.0946 10.1394 3.69705 8.99965ZM7.00234 20.153C5.63463 20.153 4.85308 18.7853 5.55322 17.5641C6.54643 15.8707 7.60478 14.1937 8.63056 12.5166C10.4053 9.61837 12.1801 6.72014 13.9548 3.8219C14.3782 3.13805 14.8829 2.60073 15.7459 2.64958C17.081 2.73099 17.7649 4.11498 17.0159 5.35243C15.4528 7.97387 13.8409 10.5627 12.2452 13.1516C11.0403 15.138 9.81916 17.1082 8.61428 19.0946C8.23979 19.7134 7.7676 20.1367 7.00234 20.153ZM21.2656 10.7256C20.3863 12.2398 19.442 13.7215 18.5302 15.2195C17.5207 16.8477 16.5274 18.4922 15.5179 20.1041C14.8504 21.1788 13.906 21.4718 13.0105 20.902C12.1475 20.3646 11.9847 19.3714 12.6034 18.3456C14.4922 15.2683 16.3809 12.191 18.2696 9.09734C18.6441 8.47862 19.1326 8.05528 19.8979 8.07156C21.2493 8.07156 21.9983 9.47183 21.2819 10.7093L21.2656 10.7256Z" fill="#00060C"/>
<path d="M78.9557 6.28113H84.0032C85.1918 10.368 86.3804 14.4222 87.569 18.4928C87.6342 18.4928 87.6993 18.4928 87.7644 18.4928C88.953 14.4222 90.1416 10.368 91.3139 6.29741H96.3777C94.3587 12.0613 92.356 17.7438 90.3859 23.41H84.9313C82.9449 17.7275 80.9584 12.0613 78.9395 6.28113H78.9557Z" fill="#00060C"/>
<path d="M73.3242 0.455078H77.9158V23.3805H73.3242V0.455078Z" fill="#00060C"/>
<path d="M53.6811 9.19882C53.1927 6.46341 51.9878 4.10248 49.6594 2.40913C47.9335 1.17168 45.9796 0.520395 43.9118 0.455266C40.7856 0.34129 37.6431 0.422701 34.4355 0.422701V23.3806C34.6147 23.4132 34.7449 23.4458 34.8752 23.4458C38.1153 23.3969 41.3718 23.5109 44.6119 23.2504C48.7639 22.9247 51.6296 20.6778 53.1113 16.7701C54.0393 14.3114 54.1533 11.7551 53.6974 9.19882H53.6811ZM48.6988 14.6696C48.0638 17.3074 46.3053 18.8705 43.5862 19.0658C42.1859 19.1635 40.7856 19.0821 39.3039 19.0821V4.47697C41.9091 4.59095 44.6608 3.82569 46.8426 5.79584C47.673 6.54482 48.2917 7.68457 48.6336 8.7592C49.2524 10.6805 49.171 12.6832 48.6988 14.6696Z" fill="#00060C"/>
<path d="M106.667 15.9896H112.577C112.708 13.6449 112.48 11.5283 111.356 9.59068C110.021 7.31116 107.904 6.22025 105.348 5.9923C102.303 5.73179 99.6167 6.57846 97.7768 9.13477C96.002 11.5934 95.7089 14.4102 96.2788 17.3247C96.6045 19.0018 97.3046 20.5649 98.6072 21.6884C101.782 24.4238 106.699 24.5866 110.135 22.1768C111.242 21.4279 112.17 20.0927 112.447 18.4971C110.949 18.4156 109.549 18.3342 108.165 18.2528C106.862 20.3532 104.811 20.4835 103.199 19.9625C101.587 19.4414 100.708 17.9597 100.854 16.0059H106.651L106.667 15.9896ZM104.778 9.49298C106.667 9.57439 108.181 11.2189 107.986 13.0262H100.887C100.887 10.9584 102.613 9.39529 104.778 9.49298Z" fill="#00060C"/>
<path d="M71.6232 13.8412C71.4278 10.5522 70.1089 8.01217 66.9664 6.59562C63.3843 4.98368 58.7602 6.25369 56.5947 9.51014C55.113 11.7408 54.999 14.232 55.2758 16.7557C55.4549 18.4165 56.0736 19.9308 57.2297 21.2008C59.3626 23.5454 62.1306 24.0013 65.094 23.7408C67.1455 23.5617 68.9529 22.7313 70.3043 21.1194C70.923 20.3704 71.3789 19.3772 71.4278 18.4979C69.9624 18.4165 68.5621 18.3351 67.2107 18.2537C65.9732 20.4681 63.482 20.5983 61.7887 19.7679C60.3559 19.0678 59.7371 17.2768 60.0791 15.9905H71.5092C71.558 15.7788 71.5906 15.7137 71.5906 15.6323C71.5906 15.0298 71.6232 14.4437 71.5906 13.8575L71.6232 13.8412ZM67.0967 13.0108H60.0139C59.6883 11.5943 61.3165 9.70553 63.2378 9.49386C65.2242 9.28219 67.2758 10.9267 67.0967 13.0108Z" fill="#00060C"/>
</svg>`}function R(){return f.matchMedia&&f.matchMedia("(prefers-color-scheme: dark)").matches}function Z(e){const t=s.createElement("div");t.className="delve-cookie-banner";const n=`<svg viewBox="0 0 24 24" fill="none">
            <g>
                <path d="M12.1521 4.08723C12.1513 3.71959 12.1001 3.3538 12 3C16.9683 3.00545 20.9944 7.03979 21 12C21.0161 16.9625 16.9705 20.9835 12 20.9997C7.02946 21.0158 3.01615 16.963 3 12.0005C4.11168 12.2363 5.27038 11.9981 6.1499 11.2795C7.0562 10.5452 7.5789 9.43935 7.5702 8.27407C7.56959 8.01195 7.5461 7.75072 7.5 7.49268C8.51784 7.89624 9.67043 7.76409 10.5708 7.14162C11.5696 6.44537 12.161 5.3034 12.1521 4.08723Z" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3.00195 7.002V7H3V7.00195L3.00195 7.002Z" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8.00195 3.002V3H8V3.00195L8.00195 3.002Z" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M4.00195 3.002V3H4V3.00195L4.00195 3.002Z" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M10.002 17.002V17H10V17.002L10.002 17.002Z" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M15.002 15.002V15H15V15.002L15.002 15.002Z" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M11.002 12.002V12H11V12.002L11.002 12.002Z" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M16.002 10.002V10H16V10.002L16.002 10.002Z" stroke-linecap="round" stroke-linejoin="round"/>
            </g>
        </svg>`,r=o.showRejectButton&&e&&(e.consentType==="gdpr"||e.consentType==="ccpa"&&o.ccpaEnabled);return t.innerHTML=`
            <div class="delve-banner-content">
                <div class="delve-banner-icon">
                    ${n}
                </div>
                <div class="delve-banner-text">
                    <p class="delve-banner-message">${o.message}${o.showSettingsButton&&o.preferencesDisplayMode==="link"?` <a href="#" class="delve-preferences-link" data-action="settings">${o.settingsText}</a>`:""}</p>
                </div>
                <div class="delve-banner-actions">
                    ${o.showSettingsButton&&o.preferencesDisplayMode==="button"?`<button class="delve-btn delve-btn-tertiary" data-action="settings">${o.settingsText}</button>`:""}
                    ${r?`<button class="delve-btn delve-btn-secondary" data-action="reject">${o.rejectText}</button>`:""}
                    <button class="delve-btn delve-btn-primary" data-action="accept">${o.acceptText}</button>
                </div>
            </div>
            <div class="delve-auto-accept-progress">
                <div class="delve-auto-accept-progress-bar"></div>
            </div>
        `,t}function I(){const e=s.createElement("div");e.className="delve-settings-overlay";let t="";return Object.keys(o.categories).forEach(n=>{const r=o.categories[n],i=A[n];if(!i)return;const l=i.required,u=r.enabled;let d="";if(r.cookieTable){const c=r.cookieTable,b=c.headers||o.defaultCookieTableHeaders;d=`
                    <table class="delve-cookie-table">
                        <thead>
                            <tr>
                                ${Object.values(b).map(h=>`<th>${h}</th>`).join("")}
                            </tr>
                        </thead>
                        <tbody>
                            ${c.cookies.map(h=>`
                                <tr>
                                    ${Object.keys(b).map(v=>`<td>${h[v]||""}</td>`).join("")}
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                `}t+=`
                <div class="delve-category">
                    <div class="delve-category-header">
                        <span class="delve-category-name">${i.name}</span>
                        <div class="delve-toggle ${u?"enabled":""} ${l?"disabled-permanent":""}" 
                             data-category="${n}" 
                             ${l?'data-required="true"':""}>
                            <div class="delve-toggle-thumb"></div>
                        </div>
                    </div>
                    <p class="delve-category-description">${i.description}</p>
                    ${d}
                </div>
            `}),e.innerHTML=`
            <div class="delve-settings-modal">
                <div class="delve-settings-content">
                    <div class="delve-settings-header">
                        <h2 class="delve-settings-title">Cookie Preferences</h2>
                        <p class="delve-settings-subtitle">Choose which cookies you'd like to allow. You can change these settings anytime.</p>
                        ${o.privacyPolicyUrl?`<p class="delve-settings-privacy"><a href="${o.privacyPolicyUrl}" target="_blank" rel="noopener">${o.privacyPolicyText}</a></p>`:""}
                    </div>
                    ${t}
                </div>
                <div class="delve-settings-actions">
                    <button class="delve-btn delve-btn-secondary" data-action="cancel">Cancel</button>
                    <button class="delve-btn delve-btn-primary" data-action="save">Save preferences</button>
                </div>
                <div class="delve-settings-footer">
                    <div class="delve-settings-brand">
                        <span class="delve-settings-brand-text">
                            Cookie consent by 
                            <a href="https://www.delve.co/book-demo?utm_source=cookieconsent&utm_medium=web" class="delve-banner-brand-link" target="_blank">
                                <span class="delve-banner-brand-logo">${N(R())}</span>
                            </a>
                        </span>
                    </div>
                </div>
            </div>
        `,e}function $(e=!1){a&&(e&&(T=!0),a.parentNode?(a.classList.remove("hiding"),a.offsetWidth,a.classList.add("show")):(s.body.appendChild(a),setTimeout(()=>a.classList.add("show"),10)))}function k(){a&&(a.classList.remove("show"),a.classList.add("hiding"),T=!1)}function D(){if(!p)return;const e=f.scrollY;s.body.style.position="fixed",s.body.style.top=`-${e}px`,s.body.style.width="100%",s.body.dataset.scrollY=e,s.body.appendChild(p),p.style.display="flex";const t=p.querySelector(".delve-settings-content");t&&(t.scrollTop=0),Object.keys(o.categories).forEach(n=>{const r=p.querySelector(`[data-category="${n}"]`);r&&!r.dataset.required&&(o.categories[n].enabled?r.classList.add("enabled"):r.classList.remove("enabled"))})}function S(){if(!p)return;const e=s.body.dataset.scrollY||0;s.body.style.position="",s.body.style.top="",s.body.style.width="",f.scrollTo(0,parseInt(e)),delete s.body.dataset.scrollY,p.style.display="none",p.parentNode&&p.parentNode.removeChild(p),a&&a.autoAcceptState&&(a.autoAcceptState.settingsOpen=!1,a.resumeAutoAccept&&a.resumeAutoAccept())}function M(){if(a&&a.autoAcceptState&&a.autoAcceptState.timer){clearTimeout(a.autoAcceptState.timer),a.autoAcceptState.timer=null,a.autoAcceptState.remainingTime=0;const e=a.querySelector(".delve-auto-accept-progress");e&&e.classList.remove("show")}}function j(){M(),Object.keys(o.categories).forEach(e=>{o.categories[e].enabled=!0}),C(o.categories),o.manageScriptTags&&g.updateConsent(o.categories),k(),o.onAccept(o.categories)}function V(){M(),Object.keys(o.categories).forEach(e=>{const t=A[e];o.categories[e].enabled=t?.required||!1}),C(o.categories),o.manageScriptTags&&g.updateConsent(o.categories),k(),o.onReject()}function q(){Object.keys(o.categories).forEach(e=>{const t=p.querySelector(`[data-category="${e}"]`);t&&!t.dataset.required&&(o.categories[e].enabled=t.classList.contains("enabled"))}),C(o.categories),o.manageScriptTags&&g.updateConsent(o.categories),S(),k(),o.onChange(o.categories)}function U(){if(a&&(a.addEventListener("click",function(e){const t=e.target.dataset.action;switch(e.target.tagName==="A"&&t&&e.preventDefault(),t){case"accept":j();break;case"reject":V();break;case"settings":a.pauseAutoAccept&&a.pauseAutoAccept(),a.autoAcceptState&&(a.autoAcceptState.settingsOpen=!0),D();break}}),o.preferencesDisplayMode==="link")){const e=a.querySelector(".delve-preferences-link");e&&(e.addEventListener("mouseenter",function(){a.pauseAutoAccept&&a.pauseAutoAccept()}),e.addEventListener("mouseleave",function(){a.resumeAutoAccept&&a.autoAcceptState&&!a.autoAcceptState.settingsOpen&&a.resumeAutoAccept()}))}p&&(p.addEventListener("click",function(e){if(e.target===p){S();return}switch(e.target.dataset.action){case"save":q();break;case"cancel":S();break}const n=e.target.closest(".delve-toggle");n&&!n.dataset.required&&n.classList.toggle("enabled")}),p.addEventListener("wheel",function(e){const t=p.querySelector(".delve-settings-content");t&&t.contains(e.target)&&e.stopPropagation()},{passive:!1}))}async function L(){if(!o.categories||Object.keys(o.categories).length===0){console.error("DelveCookieConsent: Categories must be defined in config");return}Object.keys(o.categories).forEach(i=>{const l=o.categories[i];l.cookies&&l.cookies.length>0||l.cookieTable&&l.cookieTable.cookies&&(l.cookies=[],l.cookieTable.cookies.forEach(u=>{const d=u.name;if(d)if(d.includes("*")||d.includes("_*")||d.startsWith("^")||d.includes("/"))if(d.includes("*")){const c=d.replace(/\*/g,".*").replace(/_\.\*/,"_.*");l.cookies.push(new RegExp(`^${c}`))}else if(d.startsWith("/")&&d.endsWith("/")){const c=d.slice(1,-1);l.cookies.push(new RegExp(c))}else l.cookies.push(d);else l.cookies.push(d)}))}),o.manageScriptTags&&g.init(),m.migrate();const e=B(),t=e!==null;e&&(Object.keys(e.categories).forEach(i=>{o.categories[i]&&(o.categories[i].enabled=e.categories[i].enabled)}),o.manageScriptTags&&g.updateConsent(o.categories));const n=await E.detect();o.geoData=n;let r=!0;if(n.consentType==="gdpr"?r=!0:n.consentType==="ccpa"?r=o.ccpaEnabled:r=o.showInNonRegulatedRegions,z(),a=Z(n),p=I(),U(),!r){o.manageScriptTags&&(Object.keys(o.categories).forEach(i=>{o.categories[i].enabled=!0}),g.updateConsent(o.categories));return}if(o.autoShow&&!t&&($(),n.consentType==="ccpa"||n.consentType!=="gdpr")){let b=function(){c.isPaused||(c.startTime=Date.now(),d.style.transition=`width ${c.remainingTime}ms linear`,d.style.width="100%",c.timer=setTimeout(()=>{a&&a.classList.contains("show")&&j()},c.remainingTime))},h=function(){if(!c.timer||c.isPaused)return;c.isPaused=!0,clearTimeout(c.timer);const y=Date.now()-c.startTime;c.remainingTime=Math.max(0,c.remainingTime-y);const J=d.getBoundingClientRect().width,W=d.parentElement.getBoundingClientRect().width,X=J/W*100;d.style.transition="none",d.style.width=X+"%"},v=function(){!c.isPaused||c.remainingTime<=0||c.settingsOpen||(c.isPaused=!1,b())};const i=n.consentType==="ccpa"?1e4:5e3,l=n.consentType==="ccpa"?"\u{1F334} CCPA region detected - auto-dismissing in 10 seconds":"\u{1F30D} Non-regulated region - auto-dismissing in 5 seconds",u=a.querySelector(".delve-auto-accept-progress"),d=a.querySelector(".delve-auto-accept-progress-bar"),c={duration:i,startTime:Date.now(),remainingTime:i,isPaused:!1,timer:null,settingsOpen:!1};a.autoAcceptState=c,a.pauseAutoAccept=h,a.resumeAutoAccept=v,setTimeout(()=>{u.classList.add("show"),b()},100),a.querySelectorAll(".delve-btn").forEach(y=>{y.addEventListener("mouseenter",h),y.addEventListener("mouseleave",v)})}}function _(e={}){o={...w,...e},e.customStyles&&(o.customStyles={...w.customStyles,...e.customStyles}),s.readyState==="loading"?s.addEventListener("DOMContentLoaded",()=>L()):L()}function Y(){const e=s.cookie.split(";").filter(t=>t.trim());e.length>0,e.forEach(t=>{const n=t.indexOf("="),r=n>-1?t.substr(0,n).trim():t.trim();r&&(s.cookie=`${r}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`,s.cookie=`${r}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${f.location.hostname};`,s.cookie=`${r}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${f.location.hostname};`,s.cookie=`${r}=; expires=Thu, 01 Jan 1970 00:00:00 UTC;`)})}f.DelveCookieConsent={init:_,show:function(){Y(),m.remove(),$(!0)},hide:k,showSettings:D,hasConsent:H,getConsent:B,updatePreferences:function(e){Object.keys(e).forEach(t=>{o.categories[t]&&(o.categories[t].enabled=e[t])}),C(o.categories),o.manageScriptTags&&g.updateConsent(o.categories),o.onChange(o.categories)},acceptedCategory:function(e){return o.categories[e]?.enabled||!1},acceptedService:function(e,t){return o.categories[t]?.services?.[e]?.enabled||!1},getGeoData:function(){return o.geoData||null},detectGeo:async function(){const e=await E.detect();return o.geoData=e,e},getStorageType:function(){try{const e=localStorage.getItem(m.storageKey)!==null,t=x(o.cookieName)!==null;return e?"localStorage":t?"cookie":"none"}catch{return"cookie"}},clearAllConsent:function(){m.remove()}}})(window,document);
