"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = __importDefault(require("fs"));
var child_process_1 = require("child_process");
var nodemailer_1 = __importDefault(require("nodemailer"));
var node_notifier_1 = __importDefault(require("node-notifier"));
var Layzee = /** @class */ (function () {
    function Layzee() {
    }
    //Report command
    //Loading config
    Layzee.layzeeConfig = JSON.parse(fs_1.default.readFileSync(__dirname + "/layzeeconfig.json", "utf-8"));
    Layzee.DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    Layzee.getReportCommand = function (from, to) {
        return "git log --after=\"" + from + "\" --before=\"" + to + "\" --author=" + Layzee.layzeeConfig.author + " --format=\"# %s (%ad)\" --date=format:\"%I:%M:%S:%p\"";
    };
    Layzee.run = function () {
        var log = [];
        var layzeeConfig = Layzee.layzeeConfig;
        console.log("Running layzeee...");
        log.push("Initialized with " + JSON.stringify(layzeeConfig));
        //Unformatted
        var todayDate = new Date();
        var yesterdayDate = new Date(todayDate.toDateString());
        yesterdayDate.setDate(todayDate.getDate() - 1);
        //Formatted
        var today = Layzee.toYYYMMDD(todayDate);
        var yesterday = Layzee.toYYYMMDD(yesterdayDate);
        log.push("\nToday: ", today);
        log.push("yesterday: ", yesterday);
        var from = yesterday + " 18:00";
        var to = today + " 18:00";
        log.push("\nGenerating report from " + from + " to " + to + "\n");
        var report = [];
        report.push("Hi sir, ");
        report.push("Below given my work report from <b>" + yesterday + " 06:00PM " + Layzee.DAYS[yesterdayDate.getDay()] + "</b> to <b> " + today + " 06:00PM " + Layzee.DAYS[todayDate.getDay()] + " </b>\n\n");
        var hasAtleastOneProjectReport = false;
        //Looping through each project
        for (var _i = 0, _a = layzeeConfig.projects; _i < _a.length; _i++) {
            var project = _a[_i];
            try {
                //Getting report
                var result = child_process_1.execSync("cd " + project.path + " && " + Layzee.getReportCommand(from, to)).toString();
                if (result) {
                    hasAtleastOneProjectReport = true;
                    //Title
                    var title = "<h3>Project : " + project.name + "</h3>";
                    report.push(title);
                    report.push(result);
                    report.push("\n");
                    log.push(project.name + " has " + result.split("\n").length + " commit(s)");
                }
                else {
                    log.push(project.name + " has no commit");
                }
            }
            catch (e) {
                console.log("Error", e);
                node_notifier_1.default.notify({
                    title: '❌ Failed to sent Work Report',
                    message: "\u2709\uFE0F " + e
                });
            }
        }
        //Checking if at least one project report exist
        if (hasAtleastOneProjectReport) {
            //Ending
            report.push("Please note that the work report only contains major projects' milestones, other miscellaneous time records are not included. (eg: Research, Meetings etc)");
            report.push("\n\nFaithfully,\n" + layzeeConfig.name + ".");
            console.log(report.join("\n"));
            var from_1 = layzeeConfig.name + " <" + layzeeConfig.send_from.username + ">";
            var subject_1 = "Work Report - " + today + " / " + Layzee.DAYS[todayDate.getDay()];
            var mailBody = report.join("<br/>").replace(/\n/g, "<br/>");
            log.push("\nMailBody: \n\n");
            log.push(mailBody);
            //Sending report
            var transporter_1 = nodemailer_1.default.createTransport("smtp://" + layzeeConfig.send_from.username + ":" + layzeeConfig.send_from.password + "@" + layzeeConfig.send_from.host + "/?pool=true&port=" + layzeeConfig.send_from.port);
            var mailOptions = {
                from: from_1,
                subject: subject_1,
                to: layzeeConfig.send_to,
                cc: layzeeConfig.cc.join(","),
                html: mailBody
            };
            //Sending work report
            transporter_1.sendMail(mailOptions, function (error, info) {
                if (error) {
                    node_notifier_1.default.notify({
                        title: '❌ Failed to sent Work Report',
                        message: "\u2709\uFE0F " + error
                    });
                    transporter_1.close();
                    process.exit();
                }
                else {
                    log.push("\nReport sent: " + info.messageId);
                    //Sending log
                    var logMailOption = {
                        from: from_1,
                        subject: subject_1 + " -  LOG",
                        to: layzeeConfig.log_send_to,
                        html: log.join("<br/>").replace(/\n/g, "<br/>")
                    };
                    //Sending log mail
                    transporter_1.sendMail(logMailOption, function (error, info) {
                        if (error) {
                            node_notifier_1.default.notify({
                                title: '❌ Failed to sent Work Report LOG',
                                message: "\u2709\uFE0F " + error
                            });
                        }
                        else {
                            console.log('Log sent: %s', info.messageId);
                            node_notifier_1.default.notify({
                                title: '✔️ Work Report Sent',
                                message: '✉️ Your work report has been sent'
                            });
                        }
                        transporter_1.close();
                        process.exit();
                    });
                }
            });
        }
        else {
            node_notifier_1.default.notify({
                title: '✅️ Work Report Not Sent',
                message: '✉️ No commits found for the given projects'
            });
            process.exit();
        }
    };
    Layzee.getRepeated = function (data, repeat) {
        var arr = [];
        for (var i = 0; i < repeat; i++) {
            arr.push(data);
        }
        return arr.join("");
    };
    Layzee.toYYYMMDD = function (date) {
        function zeroPad(number) {
            return number > 9 ? number : "0" + number;
        }
        return date.getFullYear() + "-" + zeroPad(date.getMonth() + 1) + "-" + zeroPad(date.getDate());
    };
    return Layzee;
}());
Layzee.run();
