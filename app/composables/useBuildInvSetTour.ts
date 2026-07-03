import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export default function useBuildInvSetTour() {
  const startTour = () => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      steps: [
        {
          element: '#tour-title-section',
          popover: {
            title: 'Build Request — Primary',
            description: 'Welcome! This page allows you to create comprehensive build-request issues in Redmine for .NET projects, including optional Gateway and VB6 subtasks.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-access-key',
          popover: {
            title: 'Authentication',
            description: 'Enter your Redmine Access Key here. You can also toggle "Use Server Token" if you want to use the pre-configured system token instead of your own.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-build-info',
          popover: {
            title: 'Build Details',
            description: 'Select your layout (template), tracker, target version, and build branch. Use "Thisweek Release" to auto-fill current release information.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-dotnet-options',
          popover: {
            title: '.NET Options',
            description: 'This is the primary build group. Configure flags like GEN_SBOM, SEND_NOTIFY, and CLEANUP_WS for Windows and Container builds.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '#tour-gateway-options',
          popover: {
            title: 'Gateway Subtask',
            description: 'Enable this switch if your release needs a Gateway (Spring Boot) subtask created alongside the primary .NET build.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '#tour-vb6-options',
          popover: {
            title: 'VB6 Subtask',
            description: 'Include a VB6 build subtask if needed by enabling this section.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '#tour-template-save',
          popover: {
            title: 'Save Template',
            description: 'Check this to save your current configuration as a layout template for future use.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '#tour-submit-actions',
          popover: {
            title: 'Final Step',
            description: 'Click Submit to create the issues in Redmine. All results and links will be displayed in a toast message upon completion.',
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
