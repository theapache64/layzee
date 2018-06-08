import fs from 'fs';
import {execSync} from "child_process";
import nodemailer from 'nodemailer';
import notifier from 'node-notifier';

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

class Layzee {

    //Report command

    //Loading config
    private static readonly layzeeConfig: LazyConfig = JSON.parse(fs.readFileSync(`${__dirname}/layzeeconfig.json`, "utf-8"));
    private static readonly DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    private static getReportCommand = (from: string, to: string) => {
        return `git log --after="${from}" --before="${to}" --author=${Layzee.layzeeConfig.author} --format="# %s (%ad)" --date=format:"%I:%M:%S:%p"`;
    };


    public static run = () => {

        const log: Array<string> = [];

        const {layzeeConfig} = Layzee;

        console.log("Running layzeee...");
        log.push(`Initialized with ${JSON.stringify(layzeeConfig)}`);

        //Unformatted
        const todayDate = new Date();
        const yesterdayDate = new Date(todayDate.toDateString());
        yesterdayDate.setDate(todayDate.getDate() - 1);

        //Formatted
        const today = Layzee.toYYYMMDD(todayDate);
        const yesterday = Layzee.toYYYMMDD(yesterdayDate);

        log.push("\nToday: ", today);
        log.push("yesterday: ", yesterday);

        const from = `${yesterday} 18:00`;
        const to = `${today} 18:00`;

        log.push(`\nGenerating report from ${from} to ${to}\n`);

        const report: string[] = [];

        report.push("Hi sir, ");
        report.push(`Below given my work report from <b>${yesterday} 06:00PM ${Layzee.DAYS[yesterdayDate.getDay()]}</b> to <b> ${today} 06:00PM ${Layzee.DAYS[todayDate.getDay()]} </b>\n\n`);

        let hasAtleastOneProjectReport = false;

        //Looping through each project
        for (const project of layzeeConfig.projects) {

            try {

                //Getting report
                const result = execSync(`cd ${project.path} && ${Layzee.getReportCommand(from, to)}`).toString();

                if (result) {

                    hasAtleastOneProjectReport = true;

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
        if (hasAtleastOneProjectReport) {

            //Ending
            report.push("Please note that the work report only contains major projects' milestones, other miscellaneous time records are not included. (eg: Research, Meetings etc)");
            report.push(`\n\nFaithfully,\n${layzeeConfig.name}.`);
            console.log(report.join("\n"));


            const from = `${layzeeConfig.name} <${layzeeConfig.send_from.username}>`;
            const subject = `Work Report - ${today} / ${Layzee.DAYS[todayDate.getDay()]}`;
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
                        }else{

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


    private static getRepeated = (data: string, repeat: number) => {
        const arr: string[] = [];
        for (let i = 0; i < repeat; i++) {
            arr.push(data);
        }
        return arr.join("");
    };

    private static toYYYMMDD = (date: Date) => {
        function zeroPad(number: number) {
            return number > 9 ? number : `0${number}`;
        }

        return `${date.getFullYear()}-${zeroPad(date.getMonth() + 1)}-${zeroPad(date.getDate())}`;
    }
}


Layzee.run();
