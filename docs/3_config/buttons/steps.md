Steps is a new concept in 3.0, aimed at creating more powerful and complex buttons. It replaces the **Latch** functionality found in previous versions. For information about the relationship between steps and actions, refer to the file "[docs/3_config/buttons/actions.md](docs/3_config/buttons/actions.md)".

To start working with steps, click the **Add step** tab on a button. This will provide a second tab of actions on the button. For details about the relationship between steps and actions, see "[docs/3_config/buttons/actions.md](docs/3_config/buttons/actions.md)".

![Button Step 2](images/button-step2.png?raw=true 'Button Step 2')

Now when you press the button, on the first press it will execute the actions from **Step 1**, the following press with execute the actions from **Step 2**. It will keep on cycling through between the two.

You can add as many steps as you like to a button, depending on your use case. 

Sometimes you don't want it to progress between steps automatically like this. You can disable this with the **Progress** option in the button configuration further up. Instead you can use the internal actions to change the step of the button.  
With this, you can do complex scenarios like shift layers where holding one button will change other buttons to step 2, and switch back to 1 upon release.

> **Example**: You have a projector and want to close its shutter when you press the button and then open the shutter when you press it a second time. To do this, add an action to close the shutter in the **Step 1** **Press actions** list, and the open shutter action to the **Step 2** **Release actions** list.
