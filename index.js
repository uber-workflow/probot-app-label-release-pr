/** Copyright (c) 2017 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const parseTitle = require('./parse-title');

module.exports = robot => {
  robot.on('pull_request.opened', check);
  robot.on('pull_request.synchronized', check);
  robot.on('pull_request.unlabeled', check);
  robot.on('pull_request.labeled', check);

  async function check(context) {
    const pr = context.payload.pull_request;

    // set status to pending while checks happen
    setStatus(context, {
      state: 'pending',
      description: 'Checking whether to apply or remove Release label',
    });

    async function isRelease() {
      const compare = await context.github.repos.compareCommits(
        context.repo({
          base: pr.base.sha,
          head: pr.head.sha,
        }),
      );

      const files = compare.data.files;

      if (files.length !== 1) {
        return false;
      }
      const [file] = files;
      if (file.filename !== 'package.json') {
        return false;
      }
      if (file.status !== 'modified') {
        return false;
      }

      const head = context.github.repos.getContent(
        context.repo({
          path: file.filename,
          ref: pr.head.sha,
        }),
      );

      const base = context.github.repos.getContent(
        context.repo({
          path: file.filename,
          ref: pr.base.sha,
        }),
      );

      const results = await Promise.all([head, base]);
      const [after, before] = results.map(res =>
        JSON.parse(Buffer.from(res.data.content, 'base64').toString()),
      );
      if (after.version === before.version) {
        return false;
      }
      return after.version;
    }

    const version = await isRelease();
    // console.log('dang', version);
    if (version) {
      const titleVersion = parseTitle(pr.title);
      // console.log('QQQ', titleVersion);
      if (!titleVersion || titleVersion.version !== `v${version}`) {
        return setStatus(context, {
          state: 'failure',
          description: 'Detected release PR, but invalid PR title',
        });
      }
      await context.github.issues.addLabels(
        context.issue({
          labels: ['release'],
        }),
      );
    } else {
      try {
        await context.github.issues.deleteLabel(
          context.issue({
            name: 'release',
          }),
        );
      } catch (err) {
        if (err.code !== 404) {
          throw err;
        }
      }
    }

    // set status to success
    setStatus(context, {
      state: 'success',
      description: 'Release label has been set (or unset)',
    });
  }
};

async function setStatus(context, {state, description}) {
  const {github} = context;
  return github.repos.createStatus(
    context.issue({
      state,
      description,
      sha: context.payload.pull_request.head.sha,
      context: 'Release label',
    }),
  );
}
