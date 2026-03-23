export interface PlatformConfig {
  id: string;
  name: string;
  unixPath: string;
  windowsPath: string;
  distributionType: 'ask' | 'copy' | 'symlink';
}
