import {settingRow as row,settingToggle as toggle,infoRow as info} from '../rows/index.js';
import {registry} from '../../../../system/registry.js';
const title={account:'熙蒙',airplane:'飞行模式',wifi:'无线局域网',bluetooth:'蓝牙',cellular:'蜂窝网络',hotspot:'个人热点',battery:'电池',vpn:'VPN',general:'通用',about:'关于本机',update:'软件更新',storage:'iPhone 储存空间',date:'日期与时间',language:'语言与地区',accessibility:'辅助功能',wallpaper:'墙纸',notifications:'通知',sound:'声音与触感',focus:'专注模式',security:'面容 ID 与密码'};
export function settingsDetail(s,key){const head=`<button class="settings-back" data-action="settings-back">‹ 设置</button><h1>${title[key]||'设置'}</h1>`;
 let body='';
 switch(key){
 case 'account':body=`<section>${info('姓名','熙蒙')}${info('此手机','熙蒙的 iPhone')}</section>`;break;
 case 'airplane':body=`<section>${toggle('飞行模式','airplane',s.airplane)}</section>`;break;
 case 'wifi':body=`<section>${toggle('Wi-Fi','wifi',s.wifi!==false)}</section>${s.wifi!==false?`<p class="settings-caption">我的网络</p><section>${info('澳门 · 虚拟网络','已连接')}</section>`:''}`;break;
 case 'bluetooth':body=`<section>${toggle('蓝牙','bluetooth',s.bluetooth!==false)}</section><p class="settings-caption">${s.bluetooth===false?'蓝牙已关闭':'我的设备 · 暂无已配对设备'}</p>`;break;
 case 'cellular':body=`<section>${toggle('蜂窝数据','cellular',s.cellular)}</section><p class="settings-caption">本机模拟网络</p>`;break;
 case 'hotspot':body=`<section>${toggle('允许其他人加入','hotspot',s.hotspot)}</section>`;break;
 case 'vpn':body=`<section>${toggle('VPN 状态','vpn',s.vpn)}</section>`;break;
 case 'battery':body=`<section>${info('电池电量',`${s.batteryPercent??82}%`)}${toggle('低电量模式','lowPower',s.lowPower)}</section>`;break;
 case 'general':body=`<section>${row('smartphone','关于本机','','about')}${row('settings','软件更新','iOS 18.0','update')}${row('hard-drive','iPhone 储存空间','','storage')}${row('calendar','日期与时间','','date')}${row('globe','语言与地区','简体中文','language')}</section>`;break;
 case 'about':body=`<section>${info('名称','熙蒙的 iPhone')}${info('iOS 版本','18.0')}${info('照片',s.content.photos?.length||0)}${info('应用程序',registry.all?.length||20)}</section>`;break;
 case 'update':body=`<section>${info('iOS 18.0','已是最新版本')}</section>`;break;
 case 'storage':body=`<section>${info('照片',s.content.photos?.length||0)}${info('邮件',s.content.mail?.length||0)}${info('提醒事项',s.content.reminders?.length||0)}</section>`;break;
 case 'date':body=`<section>${info('日期',s.calendar?.anchorDate||'2026-10-27')}${info('游戏时间',s.clock)}${info('时区','澳门')}</section>`;break;
 case 'language':body=`<section>${info('iPhone 语言','简体中文')}${info('地区','澳门')}</section>`;break;
 case 'accessibility':body=`<section>${toggle('减少动态效果','reduceMotion',s.reduceMotion)}${toggle('粗体文本','boldText',s.boldText)}</section>`;break;
 case 'wallpaper':body=`<section><div class="settings-wallpaper" style="background-image:url('${s.wallpaper}')"></div>${info('当前墙纸','熙蒙的壁纸')}</section>`;break;
 case 'notifications':body=`<section>${toggle('允许通知','allowNotifications',s.allowNotifications!==false)}</section>`;break;
 case 'sound':body=`<section>${toggle('静音模式','silent',s.silent)}${toggle('触感反馈','haptics',s.haptics!==false)}</section>`;break;
 case 'focus':body=`<section>${toggle('勿扰模式','focus',s.focus)}</section>`;break;
 case 'security':body=`<section>${info('手机密码','已设置')}${info('面容 ID','此模拟手机未配置')}</section>`;break;
 }
 return `<div class="settings-page settings-detail">${head}${body}</div>`;
}
