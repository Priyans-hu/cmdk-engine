// The route id and label table shared by the core and CLI tests, so the runtime
// scanner and the CLI agree on every id: [path, pathToId(path), pathToLabel(path)].
export const PATH_ID_TABLE: ReadonlyArray<readonly [path: string, id: string, label: string]> = [
  // ASCII paths keep the ids and labels they had before (ids are frecency keys)
  ['/', 'home', 'Home'],
  ['', 'home', 'Home'],
  ['/billing/overview', 'billing--overview', 'Overview'],
  ['/user-settings', 'user-settings', 'User Settings'],
  ['/agent/flow-runs', 'agent--flow-runs', 'Flow Runs'],
  ['/agent-flow-runs', 'agent-flow-runs', 'Agent Flow Runs'],
  ['/APIKeys', 'apikeys', 'API Keys'],
  ['/:tenantId/billing', 'tenantid--billing', 'Billing'],
  // Documented collision: "_" and "." are dropped, as before
  ['/phone_numbers', 'phonenumbers', 'Phone Numbers'],
  ['/a_b', 'ab', 'A B'],
  ['/a.b', 'ab', 'A.B'],
  ['/ab', 'ab', 'Ab'],
  // Any script: letters, marks and digits stay, so ids are distinct
  ['/配置', '配置', '配置'],
  ['/設定', '設定', '設定'],
  ['/설정', '설정', '설정'],
  ['/配置/設定', '配置--設定', '設定'],
  ['/設定/配置', '設定--配置', '配置'],
  ['/設定/team', '設定--team', 'Team'],
  ['/configuración', 'configuración', 'Configuración'],
  ['/configuracion', 'configuracion', 'Configuracion'],
  ['/überblick', 'überblick', 'Überblick'],
  ['/Über-uns', 'über-uns', 'Über Uns'],
  ['/настройки', 'настройки', 'Настройки'],
  ['/सेटिंग्स', 'सेटिंग्स', 'सेटिंग्स'],
  ['/café', 'café', 'Café'],
  // A path with no letter or digit keeps its characters instead of becoming "home"
  ['/_', '_', ''],
]
