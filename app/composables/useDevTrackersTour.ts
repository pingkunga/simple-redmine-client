import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export default function useDevTrackersTour() {
  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      steps: [
        {
          element: '#tour-title-section',
          popover: {
            title: 'Dev Trackers',
            description: 'Welcome! This page allows you to create Dev Trackers (Program Spec or Defect) directly in Redmine.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-access-key',
          popover: {
            title: 'Authentication',
            description: 'Enter your Redmine Access Key here. You can also toggle "Use Server Token" if you want to use the pre-configured system token.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-dev-info',
          popover: {
            title: 'Tracker Information',
            description: 'Select the tracker type, project, assignee, and target version for your issue.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '#tour-tracker-title',
          popover: {
            title: 'Tracker Title',
            description: 'Provide a title following the format: [SITENAME][MODULE][IMPACT] Title. Hyphens are supported in Site Name and Module.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '#tour-submit-actions',
          popover: {
            title: 'Final Step',
            description: 'Click Submit to create the issue. All results and links will be displayed in a toast message upon completion.',
            side: 'top',
            align: 'center',
          },
        },
      ],
    })

    driverObj.drive()
  }

  return {
    startTour,
  }
}
