import {House , Planet , Bell , UserList , MonitorPlay , BookmarkSimple } from 'phosphor-react';

function IconSideBar() {
  return (
  <aside className="icon-sidebar">

    <nav className="sidebar-nav icon-sidebar-nav">
      <ul>
        <div className='profile-li'>
          <img src={User} alt="" width="35px" height="35px"/>
          
        </div>
        <li><a href="#home">{<House size={31} />}</a></li>
        <li><a href="#about">{<Planet size={31} />}</a></li>
        <li><a href="#services">{<Bell size={31} />}</a></li>
        <li><a href="#contact">{<UserList size={31} />}</a></li>
        <li><a href="#saved">{<BookmarkSimple size={31} />}</a></li>
        <li><a href="#contact">{   <MonitorPlay size={31} />}</a></li>

      </ul>
    </nav>
    <div className="sidebar-footer">
    </div>
  

  </aside>
  );
}

export default IconSideBar;