/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { User } from 'lucide-react';

interface CaregiverAvatarProps {
  gender?: 'Male' | 'Female' | string;
  className?: string;
  iconClassName?: string;
}

export const CaregiverAvatar: React.FC<CaregiverAvatarProps> = ({
  gender = 'Female',
  className = 'h-16 w-16',
  iconClassName = 'h-8 w-8'
}) => {
  const isMale = gender?.toLowerCase() === 'male';

  return (
    <div 
      className={`rounded-xl flex items-center justify-center shrink-0 border shadow-inner transition-all duration-200 ${className} ${
        isMale 
          ? 'bg-sky-50 text-sky-600 border-sky-100/70' 
          : 'bg-rose-50 text-rose-500 border-rose-100/70'
      }`}
    >
      <User className={iconClassName} />
    </div>
  );
};
