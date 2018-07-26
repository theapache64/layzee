import fs from 'fs';
import { execSync } from "child_process";
import nodemailer from 'nodemailer';
import notifier from 'node-notifier';
import { TimeManager } from './TimeManager';

interface Project {
    name: string;
    path: string;
}

interface LazyConfig {
    name: string,
    author: string,
    log_send_to: string,
    send_from: {
        host: string,
        port: string,
        username: string,
        password: string
    },
    send_to: string,
    cc: string[],
    projects: Project[]
}

interface Log {
    last_report_sent_date_time: string
}

class Layzee {

    private static readonly DATA_FILE_PATH = `${__dirname}/log.json`;
    private static readonly INITIAL_COMMIT = 'Initial Commit';

    //Loading config
    private static readonly layzeeConfig: LazyConfig = JSON.parse(fs.readFileSync(`${__dirname}/layzeeconfig.json`, "utf-8"));
    private static readonly lastReportSentLog: Log = JSON.parse(fs.readFileSync(Layzee.DATA_FILE_PATH, "utf-8"));

    private static readonly DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    private static getReportCommand = (from: string | null, to: string) => {
        const fromDate = from ? `--after="${from}"` : '';
        const toDate = `--before="${to}"`;
        return `git log ${fromDate} ${toDate} --author=${Layzee.layzeeConfig.author} --format="# %s (%ad)" --date=format:"%I:%M:%S:%p"`;
    };


    public static run = () => {

        const log: Array<string> = [];

        const { layzeeConfig } = Layzee;

        console.log("Running layzeee...");

        log.push(`Initialized with ${JSON.stringify(layzeeConfig)}`);

        const logObject = Layzee.lastReportSentLog;
        const timeMan = new TimeManager(logObject.last_report_sent_date_time);

        log.push("\nFrom: ", timeMan.lastTimeFmNotNull);
        log.push("To: ", timeMan.nowFm);

        log.push(`\nGenerating report from ${timeMan.lastTimeFmNotNull} to ${timeMan.nowFm}\n`);

        const commitsFrom = timeMan.lastTime
            ? `${timeMan.lastTimeFm} ${Layzee.DAYS[timeMan.lastTime.getDay()]}`
            : timeMan.lastTimeFmNotNull;

        const commitsTo = `${timeMan.nowFm} ${Layzee.DAYS[timeMan.now.getDay()]}`;

        const report: string[] = [];

        report.push("Hi sir, ");
        report.push(`Below given my work report from <b>${commitsFrom}</b> to <b> ${commitsTo} </b>\n\n`);

        let hasAtLeastOneProjectReport = false;

        //Looping through each project
        for (const project of layzeeConfig.projects) {

            try {

                //Getting report
                const result = execSync(`cd ${project.path} && ${Layzee.getReportCommand(timeMan.lastTimeFm, timeMan.nowFm)}`).toString();

                if (result) {

                    hasAtLeastOneProjectReport = true;

                    //Title
                    const title = `<h3>Project : ${project.name}</h3>`;
                    report.push(title);
                    report.push(result);
                    report.push("\n");

                    log.push(`${project.name} has ${result.split("\n").length} commit(s)`);

                } else {
                    log.push(`${project.name} has no commit`);
                }

            } catch (e) {
                console.log("Error", e);
                notifier.notify({
                    title: '❌ Failed to sent Work Report',
                    message: `✉️ ${e}`
                });
            }

        }

        //Checking if at least one project report exist
        if (hasAtLeastOneProjectReport) {

            //Ending
            report.push("Please note that the work report only contains major projects' milestones, other miscellaneous time records are not included. (eg: Research, Meetings etc)");
            report.push(`\n\nFaithfully,\n${layzeeConfig.name}.`);
            console.log(report.join("\n"));


            const from = `${layzeeConfig.name} <${layzeeConfig.send_from.username}>`;
            const subject = `Work Report - ${timeMan.lastTimeFmNotNull} / ${Layzee.DAYS[timeMan.now.getDay()]}`;
            const mailBody = report.join("<br/>").replace(/\n/g, "<br/>");

            log.push("\nMailBody: \n\n");
            log.push(mailBody);

            //Sending report
            const transporter = nodemailer.createTransport(`smtp://${layzeeConfig.send_from.username}:${layzeeConfig.send_from.password}@${layzeeConfig.send_from.host}/?pool=true&port=${layzeeConfig.send_from.port}`);
            const mailOptions = {
                from: from,
                subject: subject,
                to: layzeeConfig.send_to,
                cc: layzeeConfig.cc.join(","),
                html: mailBody
            };

            //Sending work report
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {

                    notifier.notify({
                        title: '❌ Failed to sent Work Report',
                        message: `✉️ ${error}`
                    });

                    transporter.close();
                    process.exit();

                } else {

                    log.push(`\nReport sent: ${info.messageId}`);

                    //Sending log
                    const logMailOption = {
                        from: from,
                        subject: `${subject} -  LOG`,
                        to: layzeeConfig.log_send_to,
                        html: log.join("<br/>").replace(/\n/g, "<br/>")
                    };

                    //Sending log mail
                    transporter.sendMail(logMailOption, (error, info) => {

                        if (error) {
                            notifier.notify({
                                title: '❌ Failed to sent Work Report LOG',
                                message: `✉️ ${error}`
                            });
                        } else {

                            // Update last sent time here
                            logObject.last_report_sent_date_time = timeMan.now.toISOString();
                            fs.writeFileSync(Layzee.DATA_FILE_PATH, JSON.stringify(logObject));

                            console.log('Log sent: %s', info.messageId);

                            notifier.notify({
                                title: '✔️ Work Report Sent',
                                message: '✉️ Your work report has been sent'
                            });
                        }

                        transporter.close();
                        process.exit();

                    });

                }


            });

        } else {

            notifier.notify({
                title: '✅️ Work Report Not Sent',
                message: '✉️ No commits found for the given projects'
            });

            process.exit();
        }

    };
}


Layzee.run();
