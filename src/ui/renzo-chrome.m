#import <Foundation/Foundation.h>
#import <ScriptingBridge/ScriptingBridge.h>

@interface CollectorChromeApplication : SBApplication
- (SBElementArray *)windows;
@end
@interface CollectorChromeWindow : SBObject
- (SBElementArray *)tabs;
- (NSString *)id;
@end
@interface CollectorChromeTab : SBObject
- (NSString *)id;
- (NSString *)URL;
- (void)setURL:(NSString *)url;
- (id)executeJavascript:(NSString *)source;
- (void)close;
@end

int main(int argc, const char *argv[]) {
  @autoreleasepool {
    @try {
      if (argc < 4) @throw [NSException exceptionWithName:@"Arguments" reason:@"Expected PID, operation and target" userInfo:nil];
      pid_t pid = (pid_t)atoi(argv[1]);
      CollectorChromeApplication *chrome = (CollectorChromeApplication *)[SBApplication applicationWithProcessIdentifier:pid];
      if (!chrome || !chrome.isRunning) @throw [NSException exceptionWithName:@"Chrome" reason:@"Chrome Renzo is not running" userInfo:nil];
      chrome.timeout = 600;
      NSString *operation = @(argv[2]);
      if ([operation isEqualToString:@"locate"]) {
        // --new-window creates one foreground window containing one tab.
        // Inspect only that tab, never enumerate other tabs or their URLs.
        CollectorChromeWindow *window = [[[chrome windows] get] firstObject];
        CollectorChromeTab *tab = [[[window tabs] get] firstObject];
        if (![[tab URL] isEqualToString:@(argv[3])]) return 2;
        printf("%s:%s", [[[window id] description] UTF8String], [[[tab id] description] UTF8String]);
        return 0;
      }
      if (argc < 5) return 2;
      CollectorChromeWindow *window = [[chrome windows] objectWithID:@(argv[3])];
      CollectorChromeTab *tab = [[window tabs] objectWithID:@(argv[4])];
      if ([operation isEqualToString:@"execute"] && argc == 6) {
        id value = [tab executeJavascript:@(argv[5])];
        if ([value isKindOfClass:[NSString class]]) printf("%s", [value UTF8String]);
        else if (value) printf("%s", [[value description] UTF8String]);
      } else if ([operation isEqualToString:@"navigate"] && argc == 6) [tab setURL:@(argv[5])];
      else if ([operation isEqualToString:@"close"]) [tab close];
      else return 2;
      NSError *error = chrome.lastError;
      if (error) { fprintf(stderr, "%s", [[error localizedDescription] UTF8String]); return 1; }
      return 0;
    } @catch (NSException *error) { fprintf(stderr, "%s", [error.reason UTF8String]); return 1; }
  }
}
