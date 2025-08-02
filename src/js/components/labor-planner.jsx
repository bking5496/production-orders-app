// Modern Labor Management System with Mobile-First Design
// This replaces the original labor-planner.jsx with modular architecture

import LaborPlannerContainer from './labor-planner-container.jsx';

// Export the new container as the main component
export function LaborManagementSystem() {
  return <LaborPlannerContainer />;
}

export default LaborPlannerContainer;