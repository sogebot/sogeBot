import fs from 'fs';
import inspector from 'inspector';
import { gzip } from 'zlib';

import { MINUTE, SECOND } from '@sogebot/ui-helpers/constants';

import {
  error, getDEBUG, isDebugEnabled, setDEBUG, warning,
} from '~/helpers/log';

let isProfilerRunning = false;

// to enable profiler, set debug profiler.<minutes>
setInterval(() => {
  const debug = getDEBUG();
  const match = debug.match(/profiler\.?(\d+)?/);
  const minutes = Number(match ?  match[1] : 30);
  const fullMatch = match ?  match[0] : '';

  if (isDebugEnabled('profiler') && !isProfilerRunning) {
    isProfilerRunning = true;
    const session = new inspector.Session();

    session.connect();
    session.post('Profiler.enable', () => {
      session.post('Profiler.start', () => {
        warning('Profiler start at ' + new Date().toLocaleString() + ' | Expected end at ' + new Date(Date.now() + (minutes * MINUTE)).toLocaleString());
        setTimeout(() => {
          // some time later...
          session.post('Profiler.stop', (err, { profile }) => {
            // Write profile to disk, upload, etc.
            if (!err) {
              gzip(JSON.stringify(profile), (err2, buf) => {
                if (err2) {
                  error(err2.stack);
                } else {
                  fs.writeFileSync('./logs/profile-' + Date.now() + '.cpuprofile.gz', buf);
                  warning('Profiler saved at ./logs/profile-' + Date.now() + '.cpuprofile.gz');
                  setDEBUG(getDEBUG()
                    .replace(fullMatch, '')
                    .replace(/,$/, ''),
                  );
                  isProfilerRunning = false;
                }
              });
            }
          });
        }, minutes * MINUTE);
      });
    });
  }
}, 10 * SECOND);