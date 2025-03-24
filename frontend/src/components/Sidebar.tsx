// src/components/Sidebar.tsx

import React from 'react';
import { NavLink } from 'react-router-dom';

interface SidebarItem {
  key: string;
  label: string;
  path: string;
}

interface SidebarProps {
  items: SidebarItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ items }) => {
  return (
    <div className="w-60 bg-gray-800 text-white flex flex-col fixed h-full overflow-y-auto">
      <h1 className="text-2xl font-bold p-4">Dashboard</h1>
      <nav className="flex-1">
        <ul>
          {items.map((item) => (
            <li key={item.key}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `block py-2 px-4 hover:bg-gray-700 ${
                    isActive ? 'bg-gray-700' : ''
                  }`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
