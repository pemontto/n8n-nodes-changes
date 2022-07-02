import { IExecuteFunctions } from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import deepDiff from 'deep-diff-pizza';
import set from 'lodash.set';

function groupChange(changeset: any, change: any) {
	if (!changeset[change.operation]) {
		changeset[change.operation] = {};
	}
	const changeValue = change.operation === 'REMOVED' ? change.was : change.is;
	set(changeset[change.operation], change.path, changeValue);
	return changeset;
}

export class Changes implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Changes',
		name: 'changes',
		group: ['changes', 'diff'],
		version: 1,
		description: 'Detect differences between two inputs',
		defaults: {
			name: 'Changes',
			color: '#ed230d',
		},
		icon: 'file:changes.svg',
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Value 1',
				name: 'value1',
				type: 'string',
				default: '',
				description: 'First value to be compared',
			},
			{
				displayName: 'Value 2',
				name: 'value2',
				type: 'string',
				default: '',
				description: 'Second value to be compared',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
	
		let item: INodeExecutionData;
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			let value1 =  this.getNodeParameter('value1', itemIndex, {});
			let value2 =  this.getNodeParameter('value2', itemIndex, {});
			

			item = items[itemIndex];
			const newItem: INodeExecutionData = {
				json: JSON.parse(JSON.stringify(item.json)),
				pairedItem: item.pairedItem,
			};

			if (item.binary !== undefined) {
				// Create a shallow copy of the binary data so that the old
				// data references which do not get changed still stay behind
				// but the incoming data does not get changed.
				newItem.binary = {};
				Object.assign(newItem.binary, item.binary);
			}

			try {
				if (typeof value1 === 'string') {
					value1 = JSON.parse(value1);
				}
				if (typeof value2 === 'string') {
					value2 = JSON.parse(value2);
				}
				
				console.log(`typeof value1: ${typeof value1}`);
				console.log(`typeof value2: ${typeof value2}`);
				let diff =  deepDiff(value1, value2);
				console.log(`diff: ${JSON.stringify(diff, null,2)}`);
				diff = diff.reduce(groupChange, {});
				console.log(`diff: ${JSON.stringify(diff, null,2)}`);
				newItem.json = {
					...newItem.json,
					...diff,
				};
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({json: this.getInputData(itemIndex)[0].json});
					continue;
				} else {
					throw new NodeOperationError(this.getNode(), error as Error);
				}
			}
			returnData.push(newItem);
		}
		console.log(`returnData: ${JSON.stringify(returnData, null,2)}`);

		return this.prepareOutputData(returnData);
	}
}
