export interface IUserAction {
    login: (
        loggedInToken: string,
        loggedInUser_ID: string,
        loggedInRole: string, 
        loggedInName : string)
        => {
        type: string;
        loggedInToken: string;
        loggedInUser_ID: string;
        loggedInRole: string;
        loggedInName : string;
       };

    logout: () => {
        type: string;
    };
}