'use client';
import { motion, HTMLMotionProps } from 'framer-motion';
import React from 'react';
 
export default function MotionButton(props: HTMLMotionProps<'button'>) {
  return <motion.button {...props}>{props.children}</motion.button>;
} 