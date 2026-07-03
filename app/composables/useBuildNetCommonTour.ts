import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export default function useBuildNetCommonTour() {
  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      steps: [
        {
          element: '#tour-title-section',
          popover: {
            title: 'Build Configuration - NET Common',
            description: 'Welcome! This page allows you to create a Build-Request issue for .NET Common libraries.',
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
          element: '#tour-build-info',
          popover: {
            title: 'Build Information',
            description: 'Select the tracker, project, assignee, and target version. The version is used as both COMMON_VERSION and TAG_VERSION.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '#tour-build-options',
          popover: {
            title: 'Build Options',
            description: 'Configure build settings like test execution, SonarQube analysis, and publishing options.',
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
