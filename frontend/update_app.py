import os

fp = r'd:\Axeecom\Agent365\frontend\App.tsx'
with open(fp, 'r', encoding='utf-8') as f:
    text = f.read()

# Add import
text = text.replace(
    \"const NotFoundPage = React.lazy(() => import('./components/pages/NotFoundPage'));\",
    \"const NotFoundPage = React.lazy(() => import('./components/pages/NotFoundPage'));\nconst PublicChatPage = React.lazy(() => import('./components/pages/PublicChatPage'));\"
)

# Update Page type
text = text.replace(
    \"  | 'studioAdmin'\n  | 'notFound';\",
    \"  | 'studioAdmin'\n  | 'publicChat'\n  | 'notFound';\"
)

# Update RouteState
text = text.replace(
    \"  next?: string;\n};\",
    \"  next?: string;\n  agentId?: string;\n};\"
)

# Update getRouteFromLocation
text = text.replace(
    \"  if (path.startsWith('/studio')) return { page: 'creatorStudio', next };\n  return { page: 'notFound' };\",
    \"  if (path.startsWith('/studio')) return { page: 'creatorStudio', next };\n  \n  if (path.startsWith('/chat/')) {\n    const agentId = path.split('/')[2];\n    if (agentId) return { page: 'publicChat', agentId, next };\n  }\n\n  return { page: 'notFound' };\"
)

# Update pathForPage
text = text.replace(
    \"    case 'studioAdmin':\n      return '/studio/admin';\n    case 'notFound':\",
    \"    case 'studioAdmin':\n      return '/studio/admin';\n    case 'publicChat':\n      return '/chat';\n    case 'notFound':\"
)

# Update renderPage
text = text.replace(
    \"      case 'studioAdmin':\n        return <CreatorStudioPage initialView=\\\"admin-dashboard\\\" />;\n      case 'notFound':\",
    \"      case 'studioAdmin':\n        return <CreatorStudioPage initialView=\\\"admin-dashboard\\\" />;\n      case 'publicChat':\n        if (route.agentId) return <PublicChatPage agentId={route.agentId} />;\n        return <NotFoundPage onGoHome={() => navigateTo('login')} />;\n      case 'notFound':\"
)


with open(fp, 'w', encoding='utf-8') as f:
    f.write(text)
