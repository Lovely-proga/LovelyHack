export default class Command {
    constructor(name, description, args) {
        this.name = name;
        this.description = description;
        this.arguments = arguments;
    }

    execute(args) {}
};