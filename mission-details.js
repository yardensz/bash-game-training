// Explicit goals are separate from examples: examples never change the mission target.
export const missionDetails = [
  {steps:['Type pwd in the terminal and press Enter.'],target:'The terminal prints /home/student.'},
  {steps:['Use ls to list the files and folders in /home/student.'],target:'The list includes archive, missions, and welcome.txt.'},
  {steps:['Use cd to move into the missions folder.'],target:'Your prompt changes from ~ to ~/missions.'},
  {steps:['Move into the missions folder.','Use cd with .. to return to its parent folder.'],target:'Finish in /home/student, after visiting missions.'},
  {steps:['Use cat to display the contents of welcome.txt.'],target:'Both lines of the welcome message appear in the terminal.'},
  {steps:['Use ls with the -a flag to reveal hidden files.','Use cat to read the hidden file named .secret.'],target:'The terminal prints: The hidden door is open.'},
  {steps:['Create a folder named project inside /home/student.'],target:'A new directory exists at /home/student/project. No output is expected.'},
  {steps:['Create an empty file named plan.txt inside /home/student.'],target:'plan.txt exists and contains no text. No output is expected.'},
  {steps:['Use echo to print the exact text: Hello Bash'],target:'One line: Hello Bash (capital H and B, one space).'},
  {steps:['Use echo and > to write Mission started into plan.txt.'],target:'plan.txt contains one line: Mission started. Output goes to the file, not the screen.'},
  {steps:['Create plan.txt with a first line containing exactly Mission started.','Append a second line containing exactly Learn Bash using >>.'],target:'plan.txt contains two lines, in that order. Keep the first line.'},
  {steps:['Copy welcome.txt into the existing archive folder. Keep the filename welcome.txt.'],target:'Both welcome.txt and archive/welcome.txt exist with identical contents.'},
  {steps:['Rename welcome.txt to message.txt using mv.'],target:'message.txt contains the welcome message; welcome.txt no longer exists.'},
  {steps:['Create an empty file named scratch.txt.','Delete scratch.txt using rm.'],target:'scratch.txt was created and then removed; leave the other files alone.'},
  {steps:['Search missions/log.txt for the exact uppercase text ERROR using grep.'],target:'Only the two ERROR lines appear, not the INFO lines.'},
  {steps:['Use wc with the -l flag to count lines in missions/crew.txt.'],target:'The output shows 4 followed by the filename.'},
  {steps:['Use head with -n to show exactly the first 2 lines of missions/log.txt.'],target:'INFO launch ready, then ERROR antenna offline.'},
  {steps:['Filter missions/log.txt for ERROR using grep.','In the SAME command, pipe that output into wc -l. Do not give wc a filename.'],target:'The terminal prints only the number 2.'},
  {steps:['Sort the names in missions/crew.txt.','In the SAME command, pipe the sorted output into uniq.'],target:'Three lines, in order: Maya, Noam, Yarden. Each name appears once.'},
  {steps:['Filter missions/log.txt for ERROR.','Redirect the result into report.txt in your home directory.'],target:'report.txt contains the two ERROR lines. No INFO lines and no count.'},
  {steps:['Assign the exact value Yarden to a variable named pilot. No spaces around =.','Use echo and $pilot to print the stored value.'],target:'The variable pilot holds Yarden, and the terminal prints Yarden.'},
  {steps:['Use echo to print the literal text $HOME. Protect it from variable expansion with single quotes.'],target:'Exactly $HOME appears, including the dollar sign — not /home/student.'},
  {steps:['Move into the missions folder.','Use cd with ~ or "$HOME" to return to your home directory.'],target:'Finish in /home/student, after visiting missions.'},
  {steps:['Create a directory named rescue in your home directory.','Save only the ERROR lines from missions/log.txt into rescue/errors.txt.','Count those saved lines and write only the number to rescue/count.txt.'],target:'rescue/errors.txt contains the two ERROR lines; rescue/count.txt contains 2.'}
];
export const sectors = [
  {name:'Navigation',badge:'Pathfinder',story:'Bring the navigation console online.',icon:'⌖'},
  {name:'Storage',badge:'Builder',story:'Prepare the station’s storage systems.',icon:'▣'},
  {name:'Diagnostics',badge:'Investigator',story:'Find the faults and decode the logs.',icon:'⌕'},
  {name:'Mission control',badge:'Bash explorer',story:'Restore communications and launch the rescue.',icon:'✦'}
];
